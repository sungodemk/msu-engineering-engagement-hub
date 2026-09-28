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

    const [companies, setCompanies] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [portfolios, setPortfolios] = useState([]);
    const [activities, setActivities] = useState([]);

    // Found the .find() method to get the corresponding company from the companies array based on its id
    // from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    const company = companies.find((c) => c.id === selectedId);

    useEffect(() => {
        fetch("http://localhost:8080/api/companies")
        .then(result => result.json())
        .then(data => {
            setCompanies(data);
            setSelectedId(data.length > 0 ? data[0].id : '');
        });
    }, []);

    useEffect(() => {
        fetch("http://localhost:8080/api/portfolio")
        .then(result => result.json())
        .then(data => {
            setPortfolios(data);
        });
    }, []);

    const portfolio = portfolios.find((p) => p.id === selectedId);

    useEffect(() => {
        fetch(`http://localhost:8080/api/companies/${selectedId}/temporal`)
        .then(result => result.json())
        .then(data => {
            setActivities(data);
        });
    }, [selectedId]);

    function handleChange(e) {
        setSelectedId(e.target.value);
    }

    return (
        <div className="company-page">
            <select className="company_select" value={selectedId} onChange={handleChange}>
            {companies.map(c => (
                <option key={c.id} value={c.id}>
                {c.display_name}
                </option>
            ))}
            </select>

            <div className='title_box'>
                <div className='c_title_text'>
                    {company ? company.display_name : 'Company Name'}
                </div>
                <div className='location'>
                    📍{company?.city && company?.state ? `${company.city}, ${company.state}` : 'Not Available'}
                </div>
                <div className='industry_box'>
                    <div className='industry_text'>
                        {company?.industry ? company.industry : 'Industry Not Available'}
                    </div>
                </div>
                <div className='industry_detail_box'>
                    <div className='industry_detail_text'>
                        {company?.industry_detail ? company.industry_detail : 'Detail Not Available'}
                    </div>
                </div>
                <div className='owner'>
                    Owner: {portfolio?.owner ? portfolio.owner : 'Not Available'}
                </div>
                <button className='log_ac_box' type='button' onClick={() => setIsDialogOpen(true)}>
                    <span>+ Log Activity</span>
                </button>
                
            </div>
            
            <div className='total_giving_box'>
                <div className="total_giving_title">TOTAL GIVING</div>
                <div className="total_giving_amount">
                    {company?.total_giving_amount ? `$${company.total_giving_amount}` : '$0'}
                </div>
                <div className='giving_message'>
                    {/* Learned how to iterate key value pairs using Object.entries() 
                    from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries#iterating_through_an_object*/}
                    {company?.giving_counts ? Object.entries(company.giving_counts).map(([type, count]) => (
                    `${type}: ${count}`)
                    ).join(' & ') : 'No giving recorded yet'}
                </div>
            </div>
            <div className='award_box'>
                <div className='award_title'>ACTIVE RESEARCH AWARDS</div>
                <div className='total_award_amount'>0</div>
                <div className='award_message'>No awards yet</div>
            </div>
            <div className='caps_team_box'>
                <div className='caps_team_title'>CAPSTONE TEAMS</div>
                <div className='num_of_teams'>0</div>
                <div className='caps_team_message'>No capstone teams yet</div>
            </div>
            <div className='last_contact_date_box'>
                <div className='last_contact_date_title'>LAST CONTACT</div>
                <div className='last_contact_date'>
                    {company?.latest_contact_date ? company.latest_contact_date : 'Not Available'}
                </div>

                <div className='days_passed_from_lcd'>
                    {company?.days_passed ? `${company.days_passed} days ago` : 'Not Available'}
                </div>
            </div>
            <div className='inbound_outbound_section'>
                
                <table className='inbound_box'>
                    <div className='inbound_title_box'>
                        <div className='inbound_title'>⬇ Inbound to MSU</div>
                    </div>
                    {activities.some(activity => activity.activity_type === 'gift') ? (
                    <tbody>
                        {activities.filter(activity => activity.activity_type === 'gift').map(activity => (
                            <tr key={activity.id}>
                                <td className='inbound_occurred_on'>{activity.occurred_on}</td>
                                {/* Learned how to extract the element inside a parentheses using .match()
                                from this link: https://blog.devgenius.io/regex-parentheses-examples-of-every-type-aba8441be761*/}
                                <td className='inbound_notes'>{activity.notes?.match(/\(([^)]+)\)/g)}</td>
                                <td className='inbound_amount'>{`$${activity.amount}`}</td>
                            </tr>
                        ))}
                    </tbody>) : (<p>No inbound available</p>)}
                </table>
                <div className='outbound_box'>
                    <div className='outbound_title_box'>
                        <div className='outbound_title'>⬆ Outbound from MSU</div>
                    </div>
                    <p>No outbound available</p>
                </div>
            </div>
            <table className='activity_box'>
                <thead>
                    <tr>
                        <th colSpan="5" className='activity_title_box'>
                            <div className='activity_title'>Activity Timeline</div>
                        </th>
                    </tr>
                </thead>
                {company?.activity_timeline?.length > 0 ? (
                    <tbody>
                        {company.activity_timeline.map(activity => (
                            <tr key={activity.opp_id}>
                                <td className='activity_record_type'>{activity.record_type}</td>
                                <td className='activity_stage'>{activity.stage}</td>
                                <td className='activity_amount'>{`$${activity.amount}`}</td>
                                <td className='activity_close_date'>{activity.close_date}</td>
                            </tr>
                        ))}
                    </tbody>) : (<p>No activities available</p>)}
            </table>
            <div className="msu_task_box">
                <div className="msu_task_title_box">
                    <div className="msu_task_title">
                        <div className="msu_unit_title">MSU UNIT</div>
                        <div className="owner_title">OWNER</div>
                        <div className="subj_title">SUBJECT</div>
                        <div className="status_title">STATUS</div>
                    </div>
                </div>
                <tbody>
                        {company?.msu_tasks?.length > 0 ? (
                            company.msu_tasks.map(task => (
                                <tr key={task.task_id}>
                                    <td className='msu_unit'>{task.msu_unit}</td>
                                    <td className='comp_owner'>{task.owner_name}</td>
                                    <td className='subject'>{task.subject}</td>
                                    <td className='status'>{task.status}</td>
                                </tr>
                            ))
                        ) : (
                            <p>No tasks available</p>
                        )}
                    </tbody>
            </div>
            <div className="research_award_box">
                <div className="research_award_title">🔬Research Awards</div>
                <div className="label_section">
                    <div className="award_id_label">AWARD ID</div>
                    <div className="sponsor_name_label">SPONSOR NAME</div>
                    <div className="research_title_label">TITLE</div>
                    <div className="PI_label">PI</div>
                    <div className="lead_unit_label">LEAD UNIT</div>
                    <div className="award_amount_label">AMOUNT</div>
                    <div className="research_status_label">STATUS</div>
                </div>
            </div>
            <div className="contacts_box">
                <div className="contacts_title_box">
                    <div className="contacts_title">𝌕Contacts at Company</div>
                </div>
            </div>
            <div className="relationship_map_box">
                <div className="relationship_map_title_box">
                    <div className="relationship_map_title">📈Relationship Map</div>
                </div>
            </div>
            <Dialog className='log_activity_dialog' open_dialog={isDialogOpen}>
                <form className='log_form'>
                    <div className='lg_act_dia_title_box'>
                        <div className='lg_act_dia_title'>Log Activity</div>
                        <div className='lg_act_dia_company'>
                            {company ? company.display_name : 'Company Name'}
                        </div>
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