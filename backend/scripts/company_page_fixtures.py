# Zhixiang Miao
"""
The file contains company page fixtures, 
it's mainly the helper function for load_fixtures.py file to load company fixtures. 
"""

CONTACT_REPORT_COLUMNS = {
    "id": "External_ID__c",
    "contact_date": "Contact_Date__c",
    "contact_type": "Contact_Type__c",
    "purpose": "Purpose__c",
    "org_id": "Account__r.External_ID__c",
    "primary_contact_id": "Primary_Contact__r.External_ID__c",
    "additional_attendees": "Additional_Attendees__c",
    "msu_staff_id": "Staff__r.External_ID__c",
    "additional_msu_staff": "Additional_MSU_Staff__c",
    "unit": "Unit__c",
    "summary": "Summary__c",
}

OPPORTUNITY_COLUMNS = {
    "opp_id": "External_ID__c",
    "name": "Name",
    "record_type": "RecordType.Name",
    "org_id": "Account.External_ID__c",
    "npsp_primary_contact_id": "npsp_Primary_Contact__r.External_ID__c",
    "stage": "StageName",
    "amount": "Amount",
    "close_date": "CloseDate",
    "type" : "Type",
}

def get_contact_dates(rows):
    contact_dates_each_company = {}
    for report in rows:
        org_id = report[CONTACT_REPORT_COLUMNS["org_id"]]
        contact_date = report[CONTACT_REPORT_COLUMNS["contact_date"]]
        if org_id not in contact_dates_each_company:
            contact_dates_each_company[org_id] = []
        contact_dates_each_company[org_id].append(contact_date)

    return contact_dates_each_company

def get_latest_contact_dates(rows):
    contact_dates_each_company = get_contact_dates(rows)
    latest_contact_date_each_company = {}
    for org_id, contact_dates in contact_dates_each_company.items():
        latest_contact_date_each_company[org_id] = max(contact_dates)

    return latest_contact_date_each_company

def get_giving_amount(rows):
    giving_amount_each_company = {}
    for opp in rows:
        org_id = opp[OPPORTUNITY_COLUMNS["org_id"]]
        temp = opp[OPPORTUNITY_COLUMNS["amount"]]
        amount = float(temp) if temp else 0
        if org_id not in giving_amount_each_company:
            giving_amount_each_company[org_id] = 0
        giving_amount_each_company[org_id] += amount

    return giving_amount_each_company