/* Zhixiang Miao */
/* Learning react from this link: https://react.dev/reference/react */

import {useEffect, useState} from 'react';
import '../css/company_page.css';
import Dialog from '../components/Dialog';
// import { createPortal } from 'react-dom';

function CompanyPage() {
    useEffect(() => {
        document.title = "Company Page";
    }, []);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

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
                <button className='log_ac_box' type='button' onClick={() => setIsDialogOpen(true)}>
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
            <Dialog className='log_activity_dialog' open_dialog={isDialogOpen}>
                <form className='log_form'> 
                    <div className='lg_act_dia_title_box'>
                        <div className='lg_act_dia_title'>Log Activity</div>
                        <div className='lg_act_dia_company'>Company Name</div>
                    </div>
                    <div className='activity_type_title'>
                        <label htmlFor="activity_type">Activity Type</label>
                        <select id="activity_type" name="activity_type" className='activity_type_box'>
                            <option value="meeting">Meeting</option>
                            <option value="call">Call</option>
                            <option value="email">Email</option>
                            <option value="presentation">Event</option>
                            <option value="webinar">Site Visit</option>
                            <option value="other">Other</option>
                        </select>
                        <button className='cancel_button' onClick={() => setIsDialogOpen(false)}>Cancel</button>
                        <button className='save_act_button' onClick={() => setIsDialogOpen(false)}>Save Activity</button>
                    </div>
                    <div className='category_title'>
                        <label htmlFor="category">Category</label>
                        <select id="category" name="category" className='category_box'>
                            <option value="touch_point">Touch Point</option>
                            <option value="talent_recruiting">Talent Recruiting</option>
                            <option value="student_experience">Student Experience</option>
                            <option value="philanthropy">Philanthropy</option>
                            <option value="research">Research</option>
                            <option value="governance">Governance</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <div className='date_title'>
                        <label htmlFor="date">Date</label>
                        <input type="date" id="date" name="date" className='date_box' />
                    </div>
                    <div className='contact_title'>
                        <label htmlFor="contact">Contact (Optional)</label>
                        <select id="contact" name="contact" className='contact_box' >
                            <option value="none">-- None --</option>
                        </select>
                    </div>
                    <div className='subject_title'>
                        <label htmlFor="subject">Subject</label>
                        <input type="text" id="subject" name="subject" className='subject_box'/>
                    </div>
                    <div className='notes_title'>
                        <label htmlFor="notes">Notes (optional)</label>
                        <textarea id="notes" name="notes" className='notes_box'></textarea>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}

export default CompanyPage;