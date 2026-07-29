# SurveyStream Portal - 16. Management Features: Structural Complications & Code Resolutions

This document provides a detailed breakdown of structural and operational complications within the **Team Management, Platform Management, Member Management, and Platform Authorization** features of your Node.js backend (`src/`). It presents high-fidelity, drop-in production code blocks to resolve these issues.

---

## 1. Feature 1: Team Management Complications

### 1.1 Cascading Soft Deletes & Authorization Cleanup
*   **The Complication**:
    When an administrator deletes a Team via the Admin Panel, the controller soft-deletes the record by setting `is_disable: 1` in the database. However, the associated platform authorization mappings (`ya_platform_auth`) and member accounts (`ya_member`) remain active.
*   **The Risk**:
    Inactive teams can still have member sessions redirecting users to surveys. Or, orphan authorization mappings continue to clutter database indexes and admin UI dropdowns.
*   **The Code Fix**:
    We update the `teamDelete` method in [adminPlatformController.js](file:///Users/aditya/Documents/freelance%20wn/src/controllers/adminPlatformController.js#L888) to perform atomic cascade disables inside a Prisma transaction.

```javascript
  static async teamDelete(req, res) {
    try {
      const { team_id } = req.body;
      if (!team_id) {
        return res.status(400).json({ code: 400, msg: 'Missing team_id' });
      }

      const teamIdParsed = Number(team_id);

      // Perform cascading soft deletes within an atomic database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Soft delete the target team
        const updatedTeam = await tx.team.update({
          where: { team_id: teamIdParsed },
          data: { is_disable: 1 }
        });

        // 2. Cascade disable all members under this team
        await tx.member.updateMany({
          where: { team_id: teamIdParsed },
          data: { is_disable: 1 }
        });

        // 3. Purge all platform authorizations for this team
        await tx.platformAuth.deleteMany({
          where: { team_id: teamIdParsed }
        });

        return updatedTeam;
      });

      return res.json({ code: 200, msg: 'Team and child members disabled, authorizations purged.', data: result });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
```

---

### 1.2 Domain Referer Host Conflicts
*   **The Complication**:
    The system routes member traffic based on their source domain (`HTTP_REFERER` matches `team_host`). If two publisher teams accidentally configure the same `team_host`, the routing engine will resolve the wrong `team_id`, leading to incorrect payout distributions.
*   **The Code Fix**:
    Implement unique validation checks in `teamCreate` and `teamUpdate` to prevent duplicate hostname bindings.

```javascript
  // Update teamCreate in adminPlatformController.js
  static async teamCreate(req, res) {
    try {
      const { team_name, team_host, commission_ratio } = req.body;
      if (!team_name) {
        return res.status(400).json({ code: 400, msg: 'Missing team_name' });
      }
      
      const host = team_host ? team_host.trim().toLowerCase() : '';
      const ratio = commission_ratio !== undefined ? Number(commission_ratio) : 0.00;

      // Validate Host Uniqueness
      if (host) {
        const existingHost = await prisma.team.findFirst({
          where: { team_host: host, is_disable: 0 }
        });
        if (existingHost) {
          return res.status(400).json({ code: 400, msg: `The host "${host}" is already bound to team: ${existingHost.team_name}` });
        }
      }

      const newTeam = await prisma.team.create({
        data: {
          team_name: team_name.trim(),
          team_host: host,
          commission_ratio: ratio,
          is_disable: 0
        }
      });
      return res.json({ code: 200, msg: 'success', data: newTeam });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
```

---

## 2. Feature 2: Member Management Complications

### 2.1 Session Token Invalidation upon Disabling Users
*   **The Complication**:
    When an administrator locks or bans a member by hitting `memberToggle`, the database flag updates immediately. However, the member's existing JWT token is stateless and remains valid until its expiration (often 24h+), allowing them to continue doing survey activities.
*   **The Code Fix**:
    We force token checking to query user status from the database, or implement a versioned token payload (`login_time`) that fails verification when invalidation triggers.
    
```javascript
// Add a middleware validation in src/middleware/apiAuth.js to verify active status:
const verifyMemberToken = async (req, res, next) => {
  const token = req.headers['apitoken'] || req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ code: 401, msg: 'Token missing.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Query database to ensure member is not disabled or deleted
    const member = await prisma.member.findUnique({
      where: { member_id: decoded.member_id }
    });

    if (!member || member.is_disable === 1) {
      return res.status(403).json({ code: 403, msg: 'Account has been disabled or removed.' });
    }

    req.member = member;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, msg: 'Token invalid or expired.' });
  }
};
```

---

## 3. Feature 3: Platform Management & Authorization Complications

### 3.1 Platform Authorization Integrity Checks
*   **The Complication**:
    When creating platform authorization mappings (`ya_platform_auth`), admins select a platform and team. If the interface allows duplicate mapping entries (e.g. mapping Team A to Platform X twice), SQL unique indexes will throw errors, or cause duplicate split calculation paths during webhooks.
*   **The Code Fix**:
    Inject a pre-existence validation inside the platform authorization add routing handler.

```javascript
  // Update authAdd in adminPlatformController.js
  static async authAdd(req, res) {
    try {
      const { platform_id, team_id, auth_rate } = req.body;
      if (!platform_id || !team_id) {
        return res.status(400).json({ code: 400, msg: 'Missing platform or team selection.' });
      }

      const pId = Number(platform_id);
      const tId = Number(team_id);
      const rate = auth_rate !== undefined ? Number(auth_rate) : 0.00;

      // Verify duplication
      const existingMapping = await prisma.platformAuth.findFirst({
        where: { platform_id: pId, team_id: tId }
      });

      if (existingMapping) {
        return res.status(409).json({ 
          code: 409, 
          msg: 'An authorization mapping already exists for this team/platform combination.' 
        });
      }

      const newAuth = await prisma.platformAuth.create({
        data: {
          platform_id: pId,
          team_id: tId,
          auth_rate: rate
        }
      });

      return res.json({ code: 200, msg: 'Authorization created successfully.', data: newAuth });
    } catch (err) {
      return res.status(500).json({ code: 500, msg: err.message });
    }
  }
```
