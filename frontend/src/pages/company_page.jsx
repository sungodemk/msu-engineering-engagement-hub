/* Zhixiang Miao */
/* Learning react from this link: https://react.dev/reference/react */

import {useEffect, useState} from 'react';
import { Link, useParams, useNavigate } from "react-router-dom";
import '../css/company_page.css';
import Dialog from '../components/Dialog';

function CompanyPage() {
    useEffect(() => {
        document.title = "Company Page";
    }, []);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [logActivities, setLogActivities] = useState([]);

    const [portfolios, setPortfolios] = useState([]);
    const [activities, setActivities] = useState([]);

    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [error, setError] = useState(null);

    const [contacts, setContacts] = useState([]);
    const [activeResearchAwards, setActiveResearchAwards] = useState([]);

    function isValidDate(date) {

        if (!date) return false;
        const today = new Date();
        if (date > today) {
            alert("Invalid date: cannot be in the future");
            return false;
        }
        return true;
    }

    {/* Need to wait for the server to respond until a promise is resolved. 
        Learned from this link: https://medium.com/@luwen900131/async-await-in-react-b10e36dac6f1*/}
    async function logActivityEventHandler(event) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const activity_record_type = formData.get('activity_type');
        const stage_name = formData.get('status');
        const notes = formData.get('notes');
        const close_date = formData.get('date');
        

        if (!activity_record_type) {
            alert("Activity type is missing");
            return;
        }
        if (!stage_name) {
            alert("Status is missing");
            return;
        }
        if (!close_date) {
            alert("Close date is missing");
            return;
        }

        if (!isValidDate(new Date(close_date))) {
            return;
        }

        if (!notes) {
            alert("Notes are missing");
            return;
        }

        const activity = {
            company_id: id,
            activity_record_type,
            stage_name,
            close_date,
            notes,
        };
        try {
            const response = await fetch(`http://localhost:8080/api/companies/${id}/log_activity`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(activity)
            });

            if (!response.ok) {
                alert("Failed to log activity");
                return;
            }

            const data = await response.json();
            setLogActivities(data.activities)

            setIsDialogOpen(false);
        } 
        
        catch (error) {
            console.error("Error logging activity:", error);
            alert("An error occurred while logging activity");
        }
    }

    async function deleteLoggedActivity(activity_id) {
        try {
            const response = await fetch(`http://localhost:8080/api/companies/${id}/log_activity?activity_id=${activity_id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                alert("Failed to delete activity");
                return;
            }

            const data = await response.json();
            setLogActivities(removeActivities => removeActivities.filter(activity => activity.id !== data.activity_id));
        } 
        
        catch (error) {
            console.error("Error deleting activity:", error);
            alert("An error occurred while deleting activity");
        }
    }

   

    const [daysPassed, setDaysPassed] = useState(null);

    const loggedActivities = logActivities.filter((activity) => activity.company_id === id);

    const inboundGivingsCount = Object.fromEntries(company?.inbound_giving_counts ? (Object.keys(company.inbound_giving_counts).map((type) => [type, company.inbound_giving_counts[type]])) || [] : []);

    useEffect(() => {
        fetch(`http://localhost:8080/api/portfolio`)
        .then(result => result.json())
        .then(data => {
            setPortfolios(data);
        });
    }, []);

    // Found the .find() method to get the corresponding company from the companies array based on its id
    // from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
    const portfolio = portfolios.find((p) => p.id === id);

    const totalGivingAmount = portfolio ? parseFloat(portfolio.total_giving || 0)
        : 0;

    let latestDate = company?.latest_contact_date;

    for (const activity of loggedActivities) {
        if (!activity.close_date) continue;
        if (!latestDate || new Date(activity.close_date) > new Date(latestDate)) {
            latestDate = activity.close_date;
        }
    }

    useEffect(() => {
        if (latestDate) {
            fetch(`http://localhost:8080/api/days_passed?last_date=${latestDate}`)
            .then(result => result.json())
            .then(data => {
                setDaysPassed(data.days_passed);
            });
        }
        else {
            setDaysPassed(null);
        }
    }, [latestDate]);

    useEffect(() => {
        fetch(`http://localhost:8080/api/companies/${id}/active_research_awards`)
        .then(result => result.json())
        .then(data => {
            setActiveResearchAwards(data.active_research_awards);
        });
    }, [id]);

    const totalAward = activeResearchAwards.reduce((total, award) => total + parseFloat(award.total_amount || 0), 0);

    useEffect(() => {
        fetch(`http://localhost:8080/api/companies/${id}/log_activity`)
        .then(result => result.json())
        .then(data => {
            setLogActivities(data.activities);
        });
    }, [id]);

    useEffect(() => {
        fetch(`http://localhost:8080/api/companies/${id}/temporal`)
        .then(result => result.json())
        .then(data => {
            setActivities(data);
        });
    }, [id]);

    useEffect(() => {
        fetch(`http://localhost:8080/api/persons`)
        .then((res) => {
            if (!res.ok) throw new Error(`Server returned ${res.status}`);
            return res.json();
        })
        .then(setContacts)
        .catch((err) => setError(err.message));
    }, []);

    const contact_people = contacts.filter((c_p) => c_p.company_id === id);

    useEffect(() => {
        setCompany(null);
        setError(null);

        fetch(`http://localhost:8080/api/companies/${id}`)
        .then(res => {
                if (res.status === 404) throw new Error('Company not found');
                if (!res.ok) throw new Error('Server has returned');
                return res.json();
            })
        .then(data => {
            setCompany(data);
            document.title = data.display_name;
        })
        .catch((err) => setError(err.message));
    }, [id]);

    if (error) {
        return <div className="company-page"><div className="comp_page">{error}</div></div>;
    }
    
    if (!company){
        return <div className="company-page"><div className="comp_page">Loading...</div></div>;
    }

    return (
        <div className="company-page">

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
            
            <div className='four_boxes_section'>
                <div className='total_giving_box'>
                    <div className="total_giving_title">TOTAL GIVING</div>
                    <div className="total_giving_amount">
                        {/* Found how to format the currency from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString */}
                        {totalGivingAmount.toLocaleString("en-US", { style: "currency", currency: "USD" }) }
                    </div>
                    <div className='inbound_giving_message'>
                        {/* Learned how to iterate key value pairs using Object.entries() 
                        from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries#iterating_through_an_object*/}
                        {Object.values(inboundGivingsCount).some(value => value > 0) ? Object.entries(inboundGivingsCount).map(([type, count]) => (
                            `${type}: ${count}`)
                        ).join(' & ') : 'No giving recorded yet'}

                        
                        
                    </div>
                </div>
                <div className='award_box'>
                    <div className='award_title'>ACTIVE RESEARCH AWARDS</div>
                    <div className='total_award_amount'>
                        {activeResearchAwards.length > 0 ? activeResearchAwards.length : '0'}
                    </div>
                    <div className='award_message'>
                        {/* Learned Intl.NumberFormat from this link: 
                            https://dev.to/josephciullo/simplify-currency-formatting-in-react-a-zero-dependency-solution-with-intl-api-3kok
                            Learned compact notation from this link: 
                            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#other_options
                        */}
                        {activeResearchAwards.length > 0 ? `${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(totalAward)} via Kuali` : 'No awards yet'}
                    </div>
                </div>
                <div className='caps_team_box'>
                    <div className='caps_team_title'>CAPSTONE TEAMS</div>
                    <div className='num_of_teams'>0</div>
                    <div className='caps_team_message'>No capstone teams yet</div>
                </div>
                <div className='last_contact_date_box'>
                    <div className='last_contact_date_title'>LAST CONTACT</div>
                    <div className='last_contact_date'>
                        {latestDate ? new Date(latestDate).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) : 'Not Available'}
                    </div>

                    <div className='days_passed_from_lcd'>
                        {daysPassed ? (daysPassed >= 0 ? `${daysPassed} days ago` : 'Not Available') : 'Not Available'}
                    </div>
                </div>
            </div>
            <div className='inbound_outbound_section'>
                
                <div className='inbound_box'>
                    <div className='inbound_title_box'>
                        <div className='inbound_title'>⬇ Inbound to MSU</div>
                    </div>
                    <div className='company-table-wrap'>
                        <table className='company-table'>
                            {activities.some(activity => activity.activity_type === 'gift') ? (
                            <tbody>
                                {activities.filter(activity => activity.activity_type === 'gift').map(activity => (
                                    <tr key={activity.id}>
                                        <td className='inbound_notes'>{activity.notes}</td>
                                        <td className='inbound_amount'>{`$${activity.amount}`}</td>
                                        <td className='inbound_occurred_on'>{new Date(activity.occurred_on).toLocaleDateString('en-US')}</td>
                                    </tr>
                                ))}
                            </tbody>) : (<p>No inbound available</p>)}
                        </table>
                    </div>
                </div>
                <div className='outbound_box'>
                    <div className='outbound_title_box'>
                            <div className='outbound_title'> ⬆Outbound from MSU</div>
                    </div>
                    {loggedActivities.length > 0 ? (
                        <div className='company-table-wrap'>
                            <table className='company-table'>
                                <tbody>
                                    {loggedActivities.map(activity => (
                                        <tr key={activity.id}>
                                            <td className='outbound_type'>{activity.activity_record_type}</td>
                                            <td className='outbound_notes'>{activity.notes}</td>
                                            <td className='outbound_status'>{activity.stage_name}</td>
                                            <td className='outbound_occurred_on'>{new Date(activity.close_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : ( <p>No outbound available</p>)}
                </div>
            </div>
            <div className='activity_box'>
                <div className='activity_title_box'>
                    <div className='activity_title'>Activity Timeline</div>
                </div>
                <div className='activity-table-wrap'>
                    <table className='activity-table'> 
                        {company?.activity_timeline?.length > 0 && (
                            <tbody>
                                {company.activity_timeline.map(activity => (
                                    <tr key={activity.opp_id}>
                                        <td className='activity_record_type'>{activity.record_type}</td>
                                        <td className='activity_stage'>{activity.stage}</td>
                                        <td className='activity_amount'>{`$${activity.amount}`}</td>
                                        <td className='activity_close_date'>{new Date(activity.close_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                        {loggedActivities.length > 0 && (
                            <tbody>
                                {loggedActivities.map(activity => (
                                    <tr key={activity.id}>
                                        <td className='activity_record_type'>
                                            <div>
                                                {activity.activity_record_type.charAt(0).toUpperCase() + activity.activity_record_type.slice(1)}
                                            </div>
                                            <button className="delete_button" onClick={() => deleteLoggedActivity(activity.id)}>
                                                Delete
                                            </button>
                                        </td>
                                        <td className='logged_activity_notes'>
                                            <div>
                                                {activity.notes}
                                            </div>
                                        </td>
                                        <td className='logged_activity_status'>
                                            <div>
                                                {activity.stage_name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                            </div>
                                        </td>
                                        <td className='logged_activity_close_date'>
                                            <div>
                                                {/* Learned how to convert string to date from this link: 
                                                    https://www.geeksforgeeks.org/javascript/convert-string-into-date-using-javascript/ */}
                                                {new Date(activity.close_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        )}
                        {(company?.activity_timeline?.length === 0 && loggedActivities?.length === 0) && (
                            <p>No activities available</p>
                        )}
                    </table>
                </div>
            </div>
            <div className="msu_task_box">
                <div className="msu_task_title_box">
                    <div className="msu_task_title">
                        <div className="msu_unit_title">MSU UNIT</div>
                        <div className="owner_title">OWNER</div>
                        <div className="subj_title">SUBJECT</div>
                        <div className="status_title">STATUS</div>
                    </div>
                </div>
                <div className='company-table-wrap'>
                    <table className='company-table'>
                        <tbody>
                            {company?.msu_tasks?.length > 0 ? (
                                company.msu_tasks.map(task => (
                                    <tr key={task.task_id}>
                                        <td className='msu_unit'>{task.msu_unit}</td>
                                        <td className='comp_owner'>{task.owner_name}</td>
                                        <td className='subject'>{task.subject}</td>
                                        <td className='status'>
                                            <div className='status_box'>
                                                {task.status}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <p>No tasks available</p>
                            )}
                        </tbody>
                    </table>
                </div>
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
                {contact_people.length > 0 ? (
                    <div className='contact-table-wrap'>
                        <table className='contact-table'>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Title</th>
                                    <th>Email</th>
                                </tr>
                            </thead>
                            <tbody>
                                {contact_people.map((p) =>(
                                    <tr key={p.id} onClick={() => navigate(`/persons/${p.id}`)}>
                                        <td>
                                            <Link to={`/persons/${p.id}`} className="pp-person-name">
                                                {p.display_name}
                                            </Link>
                                        </td>
                                        <td>{p.title ?? ''}</td>
                                        {!company && <td>{p.company ?? 'No current employer'}</td>}
                                        <td>{p.email ?? ''}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p>No contacts available</p>
                )}
            </div>
            <div className="relationship_map_box">
                <div className="relationship_map_title_box">
                    <div className="relationship_map_title">📈Temporal Graph</div>
                </div>
            </div>
            <Dialog className='log_activity_dialog' open_dialog={isDialogOpen}>
                <form onSubmit={logActivityEventHandler} className='log_form'>
                    <div className='lg_act_dia_title_box'>
                        <div className='lg_act_dia_title'>Log Activity</div>
                        <div className='lg_act_dia_company'>
                            {company ? company.display_name : 'Company Name'}
                        </div>
                    </div>
                    <div className='form_row_one'>
                    <div className='activity_type_title'>
                        <label htmlFor="activity_type">Activity Type</label>
                        {/* <input type="text" id="activity_type" name="activity_type" className='activity_type_box' /> */}
                        <select id="activity_type" name="activity_type" className='activity_type_box'>
                            <option value="" disabled selected>Select activity type</option>
                            <option value="touchpoint">Touchpoint</option>
                            <option value="ask">Ask</option>
                            <option value="recruiting">Recruiting</option>
                            <option value="action_item">Action Item</option>
                        </select>
                        
                    </div>
                    <div className='dia_status_title'>
                        <label htmlFor="status">Status</label>
                        <input type="text" id="status" name="status" className='dia_status_box' />
                    </div>
                    </div>
                    <div className='date_title'>
                        <label htmlFor="date">Date</label>
                        <input type="date" id="date" name="date" className='date_box' />
                    </div>
                    <div className='notes_title'>
                        <label htmlFor="notes">Notes</label>
                        <textarea id="notes" name="notes" className='notes_box' />
                    </div>
                    <div className='cancel_save_section'>
                        <button type="button" className='cancel_button' onClick={() => setIsDialogOpen(false)}>Cancel</button>
                        <button type="submit" className='save_act_button'>Save Activity</button>
                    </div>
                </form>
            </Dialog>
        </div>
    );
}

export default CompanyPage;