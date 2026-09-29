# Zhixiang Miao
"""
The file contains company page fixtures, 
it's mainly helper functions for load_fixtures.py file to load company fixtures. 
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

ACTION_ITEM_COLUMNS = {
    "act_id": "External_ID__c",
    "subject": "Subject__c",
    "act_type": "Type__c",
    "due_date": "Due_Date__c",
    "status": "Status__c",
    "completed": "Completed_Date__c",
    "org_id": "Account__r.External_ID__c",
    "owner_id": "Assigned_To__r.External_ID__c",
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
        rec_type = opp[OPPORTUNITY_COLUMNS["record_type"]]
        amount = float(temp) if temp else 0
        if rec_type == "Proposal":
            continue
        if org_id not in giving_amount_each_company:
            giving_amount_each_company[org_id] = 0
        giving_amount_each_company[org_id] += amount

    return giving_amount_each_company

def count_givings(rows):
    count_givings_from_company = {}
    for opp in rows:
        rec_type = opp[OPPORTUNITY_COLUMNS["record_type"]]
        comp_id = opp[OPPORTUNITY_COLUMNS["org_id"]]
        if comp_id not in count_givings_from_company:
            count_givings_from_company[comp_id] = {"Donation": 0, "In-Kind Gift": 0, "Pledge": 0}
        if rec_type == "Donation":
            count_givings_from_company[comp_id]["Donation"] += 1
        elif rec_type == "In-Kind Gift":
            count_givings_from_company[comp_id]["In-Kind Gift"] += 1
        elif rec_type == "Pledge":
            count_givings_from_company[comp_id]["Pledge"] += 1

    return count_givings_from_company

def get_activity_timeline(rows):
    activity_timeline_each_company = {}
    for activity in rows:
        comp_id = activity[OPPORTUNITY_COLUMNS["org_id"]]

        activity_timeline = {
            "opp_id": activity[OPPORTUNITY_COLUMNS["opp_id"]],
            "record_type": activity[OPPORTUNITY_COLUMNS["record_type"]],
            "stage": activity[OPPORTUNITY_COLUMNS["stage"]],
            "amount": activity[OPPORTUNITY_COLUMNS["amount"]] if activity[OPPORTUNITY_COLUMNS["amount"]] else 0,
            "close_date": activity[OPPORTUNITY_COLUMNS["close_date"]],
        }
        if comp_id not in activity_timeline_each_company:
            activity_timeline_each_company[comp_id] = []
        activity_timeline_each_company[comp_id].append(activity_timeline)

    return activity_timeline_each_company

def get_msu_tasks_info(rows, contact, account, affiliation):
    contact_ids = {c["External_ID__c"]: c for c in contact}
    account_ids = {a["External_ID__c"]: a for a in account}

    units_per_contact = {}

    msu_units = ("University Department", "Educational Institution", "Academic Program")

    for aff in affiliation:
        msu_unit_id = aff["npe5__Organization__r.External_ID__c"]
        contact_id = aff["npe5__Contact__r.External_ID__c"]
        msu_unit = account_ids[msu_unit_id]

        if not msu_unit or msu_unit["RecordType.Name"] not in msu_units:
            continue

        if contact_id not in units_per_contact:
            units_per_contact[contact_id] = []
        units_per_contact[contact_id].append(msu_unit)
        


    msu_tasks_each_company = {}
    for task in rows:
        unit_id = task[ACTION_ITEM_COLUMNS["org_id"]]
        owner_id = task[ACTION_ITEM_COLUMNS["owner_id"]]
        task_owner = contact_ids[owner_id]
        owner_name = ""
        if task_owner:
            for name in (task_owner["FirstName"], task_owner["LastName"]):
                owner_name += name + " "
        msu_unit = units_per_contact[owner_id]
        if msu_unit:
            msu_unit = msu_unit[0]
        msu_task = {
            "msu_unit": msu_unit["Name"],
            "owner_name": owner_name,
            "act_id": task[ACTION_ITEM_COLUMNS["act_id"]],
            "subject": task[ACTION_ITEM_COLUMNS["subject"]],
            "act_type": task[ACTION_ITEM_COLUMNS["act_type"]],
            "due_date": task[ACTION_ITEM_COLUMNS["due_date"]],
            "status": task[ACTION_ITEM_COLUMNS["status"]],
            "completed": task[ACTION_ITEM_COLUMNS["completed"]],
        }
        if unit_id not in msu_tasks_each_company:
            msu_tasks_each_company[unit_id] = []
        msu_tasks_each_company[unit_id].append(msu_task)

    return msu_tasks_each_company