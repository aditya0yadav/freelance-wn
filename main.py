import requests
import json

def fetch_allocated_surveys():
    url = "https://supplierapi.torfacts.com/api/v1/supplier-api/getallocatedsurveys"
    
    headers = {
        "x-api-key": "eSZHzZ8Z2iFNAyyUjQPBITCxSwOAf4c",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }
    
    try:
        print("Sending POST request to API...")
        # Switched from requests.get to requests.post and added an empty json payload
        response = requests.post(url, headers=headers, json={})
        
        print(f"Status Code: {response.status_code}")
        
        if response.text:
            try:
                print("Response Body:")
                print(json.dumps(response.json(), indent=4))
            except json.JSONDecodeError:
                print(f"Response Body (Raw): {response.text}")
        else:
            print("Response body is empty.")
            
    except requests.exceptions.RequestException as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    fetch_allocated_surveys()