/* Zhixiang Miao */
/* Learning react from this link: https://react.dev/reference/react */

import {useEffect, useState} from 'react';
import { Link, useParams, useNavigate } from "react-router-dom";
import '../css/company_page.css';
import Dialog from '../components/Dialog';
import Temporal from '../graphs/temporal'
import FollowButton from '../components/FollowButton.jsx';
import EditEntityButton from '../components/EditEntityButton.jsx';
import RelationshipGraph from '../graphs/relationship.jsx';

function CompanyPage() {
    useEffect(() => {
        document.title = "Company Page";
    }, []);

    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [logActivities, setLogActivities] = useState([]);
    const [selectLogActType, setSelectLogActType] = useState('');

    const [sortKey, setSortKey] = useState('activity_occurred_on');
    const [sortDir, setSortDir] = useState('desc');

    const [capsTeams, setCapsTeams] = useState([]);
    const [totalCapsTeams, setTotalCapsTeams] = useState(0);

    const [selectActivityType, setSelectActivityType] = useState('all')

    function handleSort(key) {
        if (sortKey === key) {
         setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        }
        else {
        setSortKey(key);
        setSortDir('asc');
        }
    }

    function arrow(key) {
        if (sortKey !== key) return '';
        return sortDir === 'asc' ? ' ↑' : ' ↓';
    }

    const [portfolios, setPortfolios] = useState([]);
    const [activities, setActivities] = useState([]);
    const [loaded, setLoaded] = useState({ id: '', data: null });

    const { id } = useParams();
    const navigate = useNavigate();
    const [company, setCompany] = useState(null);
    const [error, setError] = useState(null);

    const [contacts, setContacts] = useState([]);
    const [activeResearchAwards, setActiveResearchAwards] = useState([]);
    const [allResearchAwards, setAllResearchAwards] = useState([]);

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
        if (activity_record_type === "ask" || activity_record_type === "recruiting") {
            if (!stage_name) {
                alert("Status is missing");
                return;
            }
        }

        // if (!stage_name) {
        //     stage_name = "";
        // }

        if (!close_date) {
            alert("Date is missing");
            return;
        }

        // if (!notes) {
        //     notes = "";
        // }

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

    const NUMERIC_KEYS = ['activity_amount'];

    const loggedActivities = logActivities.filter((activity) => activity.company_id === id);

    const reshapeOriginalActivities = activities.map(activity => ({
        act_data: 'original',
        id: activity.id, 
        activity_type: activity.activity_type,
        activity_sub_type: activity.sub_type,
        activity_notes: activity.notes, 
        activity_amount: activity.amount, 
        activity_status: activity.status,
        activity_occurred_on: activity.occurred_on,
    }));

    const reshapeLoggedActivities = loggedActivities.map(activity => ({
        act_data: 'logged',
        id: activity.id, 
        activity_type: activity.activity_record_type,
        activity_sub_type: '',
        activity_notes: activity.notes, 
        activity_amount: null,
        activity_status: activity.stage_name,
        activity_occurred_on: activity.close_date,
    }));

    function getSortValue(company, key) {
        const raw = company[key];
        if (raw === null || raw === undefined || raw === '') return null;
        if (NUMERIC_KEYS.includes(key)) return Number(raw);
        if (key === "activity_occurred_on") return new Date(raw).getTime();
        return String(raw).toLowerCase();
    }

    const combinedActivities = [...reshapeOriginalActivities, ...reshapeLoggedActivities];

    const filteredActivities = combinedActivities.filter(activity =>  activity.activity_type !== 'award' && 
                                    activity.activity_type !== 'action_item' && 
                                    (selectActivityType === 'all' ? selectActivityType : activity.activity_type === selectActivityType));

    const filteredActivitiesSet = new Set(combinedActivities.filter(activity =>  activity.activity_type !== 'award' && 
                                activity.activity_type !== 'action_item').map(activity => activity.activity_type));

    const filterActivitiesArray = [...filteredActivitiesSet];
    filterActivitiesArray.sort()

    const sortedActivities = [...filteredActivities].sort((a, b) => {
        const valA = getSortValue(a, sortKey);
        const valB = getSortValue(b, sortKey);

        // nulls always sort last
        if (valA === null && valB === null) return 0;
        if (valA === null) return 1;
        if (valB === null) return -1;

        if (valA < valB) return sortDir === 'asc' ? -1 : 1;
        if (valA > valB) return sortDir === 'asc' ? 1 : -1;
        return 0;
    });

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
        fetch(`http://localhost:8080/api/companies/${id}/capstone_sponsorships`)
        .then(result => result.json())
        .then(data => {
            setTotalCapsTeams(data.length);
            setCapsTeams(data);
        });
    }, [id]);

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

    useEffect(() => {
        fetch(`http://localhost:8080/api/companies/${id}/all_research_awards`)
        .then(result => result.json())
        .then(data => {
            setAllResearchAwards(data.research_awards);
        });
    }, [id]);

    const totalAward = activeResearchAwards.reduce((total, award) => total + parseFloat(award.total_amount || 0), 0);
    const capsTotalAmount = capsTeams.reduce((total, team) => total + parseFloat(team.amount || 0), 0);

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
        fetch(`http://localhost:8080/api/companies/${id}/relationship`)
            .then(result => (result.ok ? result.json() : null))
            .then(data => setLoaded({ id: id, data }))
            .catch(() => setLoaded({ id: id, data: null }));
    }, [id])

    const isLoaded = loaded.id === id;
    const graph = isLoaded ? loaded.data : null;

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
        return <div className="company-page">{error}</div>;
    }
    
    if (!company){
        return <div className="company-page">Loading...</div>;
    }

    return (
        <div className="company-page">

            <div className='title_box'>
                <div className="company_info">
                    <div className="company_header_info">
                        <div className='c_title_text'>
                            {company ? company.display_name : 'Company Name'}
                        </div>
                        <div className="industry_info">
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
                        </div>
                    </div>
                    
                    <div className="location_owner_section">
                        <div className='location'>
                            Location: {company?.city && company?.state ? `${company.city}, ${company.state}` : 'Not Available'}
                        </div>
                        <div className='owner'>
                            Owner: {portfolio?.owner ? portfolio.owner : 'Not Available'}
                        </div>
                    </div>
                </div>
                
                
                
                
                <button className='log_ac_box' type='button' onClick={() => setIsDialogOpen(true)}>
                    <span>+ Log Activity</span>
                </button>
                {/* allows following this company from its page (Aayush) */}
                <FollowButton key={id} companyId={id} />
                {/* edits this company's fields (Aayush) */}
                <EditEntityButton key={id} entityId={id} />
                <button className="cp_print_button" type="button"  onClick={() => window.print()}>
                    Print / PDF
                </button>

            </div>
            
            <div className='four_boxes_section'>
                <div className='total_giving_box'>
                    <div className="total_giving_title">TOTAL GIVING</div>
                    <div className="total_giving_amount">
                        {/* Found how to format the currency from this link: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toLocaleString */}
                        {totalGivingAmount.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 }) }
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
                    <div className='num_of_teams'>
                        {totalCapsTeams}
                    </div>
                    <div className='caps_team_message'>
                        {capsTeams.length > 0 ? `Total Amount: ${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact" }).format(capsTotalAmount)}` : 'No capstone teams yet'}
                    </div>
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
                    {activities.length > 0 ? (
                        <div className='company-table-wrap'>
                            <table className='company-table'>
                                {activities.some(activity => activity.activity_type === 'gift') && (
                                <tbody>
                                    {activities.filter(activity => activity.activity_type === 'gift').map(activity => (
                                        <tr key={activity.id}>
                                            <td className='inbound_notes'>{activity.notes}</td>
                                            <td className='inbound_amount'>{`${parseFloat(activity.amount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 })}`}</td>
                                            <td className='inbound_occurred_on'>{new Date(activity.occurred_on).toLocaleDateString('en-US')}</td>
                                        </tr>
                                    ))}
                                </tbody>)}
                            </table>
                        </div>) : (
                        <div className='not_available_message'>No inbound available</div>
                    )}
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
                                            <td className='outbound_type'>{activity.activity_record_type.charAt(0).toUpperCase() + activity.activity_record_type.slice(1)}</td>
                                            {activity.notes ? (
                                                <td className='outbound_notes'>{activity.notes}</td>
                                            ): <td></td>}
                                            
                                            {!activity.stage_name && (
                                                <td></td>
                                            )}
                                            {activity.stage_name === "open" && (
                                            <td className='activity_stage'>
                                                <div className='open_act_box'>
                                                    <div className='open_act_status'>{activity.stage_name}</div>
                                                </div>
                                            </td>
                                            )}
                                            {activity.stage_name === "closed" && (
                                            <td className='activity_stage'>
                                                <div className='close_act_box'>
                                                    <div className='close_act_status'>{activity.stage_name}</div>
                                                </div>
                                            </td>
                                            )}
                                            <td className='outbound_occurred_on'>{new Date(activity.close_date).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : ( 
                            <div className='not_available_message'>
                                No outbound available
                            </div>
                        )}
                </div>
            </div>
            <div className='activity_box'>
                <div className='activity_title_box'>
                    <div className='activity_title'>Activity Timeline</div>
                    <div className='activity_type_buttons'>
                        <button
                        className={selectActivityType === "all" ? "activity_type_button active" : "activity_type_button"}
                        type="button"
                        onClick={() => setSelectActivityType("all")}>
                            All
                        </button>
                        {filterActivitiesArray.length > 0 && (
                            filterActivitiesArray.map(act_type => (
                                <button
                                key={act_type}
                                className={selectActivityType === act_type ? "activity_type_button active" : "activity_type_button"}
                                type="button"
                                onClick={() => setSelectActivityType(act_type)}>
                                    {act_type.charAt(0).toUpperCase() + act_type.slice(1)}
                                </button>
                            ))
                        )}
                    </div>
                </div>
                <div className='activity-table-wrap'>
                    <table className='activity-table'> 
                        <thead>
                            <tr>
                                <th onClick={() => handleSort('activity_type')}>Type{arrow('activity_type')}</th>
                                <th onClick={() => handleSort('activity_sub_type')}>Sub Type{arrow('activity_sub_type')}</th>
                                <th onClick={() => handleSort('activity_notes')}>Notes{arrow('activity_notes')}</th>
                                <th onClick={() => handleSort('activity_amount')}>Amount{arrow('activity_amount')}</th>
                                <th onClick={() => handleSort('activity_status')}>Stage{arrow('activity_status')}</th>
                                <th onClick={() => handleSort('activity_occurred_on')}>Date{arrow('activity_occurred_on')}</th>
                            </tr>
                        </thead>
                        {sortedActivities?.length > 0 && (
                            <tbody>
                                {sortedActivities.map(activity => (
                                    <tr key={activity.act_data + activity.id}>
                                        {activity.activity_type !== 'award' && activity.activity_type !== 'action_item' && (
                                            <>
                                                {activity.act_data === 'original' && (
                                                    <td className='activity_type'>{activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}</td>
                                                )}
                                                
                                                {activity.act_data === 'logged' && (
                                                        <td className='activity_type'>{
                                                            activity.activity_type.charAt(0).toUpperCase() + activity.activity_type.slice(1)}
                                                            <button className="delete_button" onClick={() => deleteLoggedActivity(activity.id)}>
                                                                Delete
                                                            </button>
                                                        </td>
                                                )}
                                                <td className='activity_sub_type'>{activity.activity_sub_type}</td>
                                                <td className='activity_notes'>{activity.activity_notes}</td>

                                                {activity.activity_type === 'gift' ? (
                                                    <td className='activity_amount'>{parseFloat(activity.activity_amount).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                                ) : <td className='activity_amount'> </td>}
                                                {activity.activity_type === 'ask' || activity.act_data === 'logged' ? (
                                                    
                                                    activity.activity_status === 'open' ? (
                                                        <td className='activity_stage'>
                                                            <div className='open_act_box'>
                                                                <div className='open_act_status'>{activity.activity_status}</div>
                                                            </div>
                                                        </td>
                                                    ) : (
                                                        activity.activity_status ? (
                                                            <td className='activity_stage'>
                                                                <div className='close_act_box'>
                                                                    <div className='close_act_status'>{activity.activity_status}</div>
                                                                </div>
                                                            </td>
                                                        ) : (<td></td>)
                                                    )
                                                ) : <td className='activity_stage'> </td>}
                                                <td className='activity_close_date'>{new Date(activity.activity_occurred_on).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td>
                                            </> 
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        )}
                        {(sortedActivities?.length === 0) && (
                            <tbody>
                                <tr>
                                    <td className='not_available_message' colSpan="6">No activities available</td>
                                </tr>
                            </tbody>
                        )}
                    </table>
                </div>
            </div>
            <div className="msu_task_box">
                <div className="msu_task_title_box">
                    <div className="msu_task_title">MSU Tasks (Action Items)</div>
                </div>
                <div className='company-table-wrap'>
                    <table className='company-table'>
                        <thead>
                            <tr>
                                <th>MSU Unit</th>
                                <th>Owner</th>
                                <th>Subject</th>
                                <th>Status</th>
                            </tr>
                        </thead>
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
                                <tr>
                                    <td className='not_available_message' colSpan="4">No tasks available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            <div className="research_award_box">
                <div className="research_award_title_box">
                    <div className="research_award_title">🔬Research Awards</div>
                </div>
                <div className='company-table-wrap'>
                    <table className='company-table'>
                        <thead>
                            <tr>
                                <th>Award ID</th>
                                <th>Title</th>
                                <th>PI</th>
                                <th>Lead Unit</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allResearchAwards.map(award => (
                                <tr key={award.id}>
                                    <td>{award.award_id}</td>
                                    <td>{award.title}</td>
                                    <td className="PI" onClick={() => navigate(`/persons/${award.pi_entity_id}`)}>
                                        <Link to={`/persons/${award.pi_entity_id}`} className="cp-person-name">
                                            {award.pi}
                                        </Link>
                                    </td>
                                    <td>{award.lead_unit}</td>
                                    <td className="award_amount">{award.total_amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                    {award.status === 'Active' ? (
                                            <td className='research_status'>
                                                <div className='research_active_box'>
                                                    <div className='research_active_status'>{award.status}</div>
                                                </div>
                                            </td>
                                        ) : (
                                            <td className='research_status'>
                                                <div className='research_closed_box'>
                                                    <div className='research_closed_status'>{award.status}</div>
                                                </div>
                                            </td>
                                    )}
                                    {/* <td className="research_status">{award.status}</td> */}
                                    <td className="research_date">{award.date ? new Date(award.date).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) : 'N/A'}</td>
                                </tr>
                            ))} 
                        </tbody>
                    </table>
                </div>
                {allResearchAwards.length === 0 && (
                    <div className='not_available_message'>No research awards available</div>
                )}
            </div>
            <div className="caps_box">
                <div className="caps_title_box">
                    <div className="caps_title">Capstone Teams</div>
                </div>
                <div className='company-table-wrap'>
                    <table className='company-table'>
                        <thead>
                            <tr>
                                <th className="caps_title_label">Title</th>
                                <th className="semester_title">Semester</th>
                                <th className="caps_amount_title">Amount</th>
                                <th className="caps_notes_title">Notes</th>
                                <th className="caps_status_title">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {capsTeams.map(capstone => (
                                <tr key={capstone.id}>
                                    <td className="capstone_title">{capstone.title}</td>
                                    <td className="semester">{capstone.semester}</td>
                                    <td className="capstone_amount">{parseFloat(capstone.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                                    <td className="capstone_notes">{capstone.notes}</td>
                                    {capstone.status === 'Completed' ? (
                                        <td className='capstone_status'>
                                                <div className='completed_box'>
                                                    <div className='completed_status'>{capstone.status}</div>
                                                </div>
                                            </td>
                                        ) : (
                                            <td className='capstone_status'>
                                                <div className='in_progress_box'>
                                                    <div className='in_progress_status'>{capstone.status}</div>
                                                </div>
                                            </td>
                                    )}
                                </tr>
                            ))} 
                        </tbody>
                    </table>
                </div>
                {totalCapsTeams === 0 && (
                    <div className='not_available_message' colSpan="5">No Capstone Team Available</div>
                )}
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
                                            <Link to={`/persons/${p.id}`} className="cp-person-name">
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
                    <div className='not_available_message'>No contacts available</div>
                )}
            </div>
            <div className="temporal_graph_box">
                <div className="temporal_graph_title_box">
                    <div className="temporal_graph_title">📈Temporal Graph</div>
                </div>
                {activities.length > 0 ? (
                    <Temporal activities={activities} />
                ) : (
                    <div className='not_available_message'>No temporal data available</div>
                )}
            </div>
            <div className="relationship_graph_box">
                <div className="relationship_graph_title_box">
                    <div className="relationship_graph_title">🔗Relationship Graph</div>
                </div>
                {graph && <RelationshipGraph data={graph} />}
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
                        <label htmlFor="activity_type">
                            Activity Type
                            <span style={{color: 'red'}}>*</span>
                        </label>
                        <select id="activity_type" name="activity_type" className='activity_type_box' onChange={(e) => setSelectLogActType(e.target.value)}>
                            <option value="" disabled selected>Select activity type</option>
                            <option value="touchpoint">Touchpoint</option>
                            <option value="ask">Ask</option>
                            <option value="recruiting">Recruiting</option>
                            <option value="schedule">Schedule</option>
                        </select>
                        
                    </div>
                    <div className='dia_status_title'>
                        {(selectLogActType === 'ask' || selectLogActType === 'recruiting') ? (
                            <label htmlFor="status">
                                Status
                                <span style={{color: 'red'}}>*</span>
                            </label>
                        ): <label htmlFor="status">Status</label>}
                        
                        <select id="status" name="status" className='dia_status_box'>
                            <option value="" disabled selected>Select status</option>
                            <option value="open">open</option>
                            <option value="closed">closed</option>
                        </select>
                    </div>
                    </div>
                    <div className='date_title'>
                        <label htmlFor="date">
                            Date
                            <span style={{color: 'red'}}>*</span>
                        </label>
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