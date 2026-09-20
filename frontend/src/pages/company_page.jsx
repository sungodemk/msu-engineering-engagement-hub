import {useEffect} from 'react';
import Layout from './layout.jsx';
import '../css/company_page.css';

function CompanyPage() {
    useEffect(() => {
        document.title = "Company Page";
    }, []);

    return (
        <div className="company-page">
            <div className='title_box'>
                <div className='c_title_text'>
                    Company Name
                </div>
                <div className='location'>
                    📍Location
                </div>
                <div className='tier_box'>
                    <div className='tier_text'>
                        Tier #
                    </div>
                </div>
                <div className='owner'>Owner: </div>
                <button className='log_ac_box'>
                    <span>+ Log Activity</span>
                </button>
            </div>
            <div className='total_giving_box'>
                <h2>Total Giving</h2>
                <div className="total_giving_amount">$0</div>
            </div>
            <div className='award_box'>
                <div className='award_text'>Active Research Awards</div>
            </div>
            <div className='caps_team_box'><h2>Capstone Teams</h2></div>
            <div className='last_contact_box'><h2>Last Contact</h2></div>
            <div className='inbound_box'>
                <div className='inbound_title_box'>⬇ Inbound to MSU</div>
            </div>
            <div className='outbound_box'>
                <div className='outbound_title_box'>⬆ Outbound from MSU</div>
            </div>
            <div className="activity_box">
                <div className="activity_title">Activity Timeline</div>
            </div>
            <div className="unit_box">
                <div className="unit_title">MSU Unit</div>
            </div>
            <div className="owner_box">
                <div className="owner_title">Owner</div>
            </div>
            <div className="subj_box">
                <div className="subj_title">Subject</div>
            </div>
            <div className="status_box">
                <div className="status_title">Status</div>
            </div>
            <div className="research_award_box">
                <div className="research_award_title">Research Awards</div>
                <div className="award_id">Award ID</div>
                <div className="sponsor_name">Sponsor Name</div>
                <div className="research_title">Title</div>
                <div className="PI">PI</div>
                <div className="lead_unit">Lead Unit</div>
                <div className="award_amount">Amount</div>
                <div className="research_status">Research Status</div>
            </div>
            <div className="contacts_box">
                <div className="contacts_title">Contacts at Company</div>
            </div>
            <div className="relationship_map_box">
                <div className="relationship_map_title">Relationship Map</div>
            </div>
            <div className="contacts_box">
                <div className="contacts_title">Contacts at Company</div>
            </div>
            <div className="relationship_map_box">
                <div className="relationship_map_title">Relationship Map</div>
            </div>

        </div>
    );
}

export default CompanyPage;