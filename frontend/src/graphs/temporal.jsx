import { useState } from "react";
import '../css/temporal.css';

const CATEGORY_META = {
    gift: {label: 'Giving', color: '#4a9c5f'},
    award: {label: 'Research Awards', color: '#3b6fd6'},
    recruiting: {label: 'Talent & Recruiting', color: '#e0722f'},
    ask: {label: 'Asks', color: '#a24fd6'},
    touchpoint: {label: 'Touchpoints', color: '#5b5f68'},
    action_item: {label: 'Tasks', color: '#d6b23b'},
};

// maps a date to a position between chartStart and chartEnd
function dateToX(date, minDate, maxDate, chartLeft, chartRight) {
    const total = maxDate - minDate;
    const elapsed = new Date(date) - minDate;
    const ratio = total === 0 ? 0 : elapsed / total;
    const edge = Math.min(1, Math.max(0, ratio))
    return chartLeft + edge * (chartRight - chartLeft);
}

function formatMonthYear(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function tooltipTitle(activity, meta) {
    return activity.sub_type || meta.label;
}

// strips the parsed-out title portion, returns the remaining descriptive text
function tooltipDescription(activity) {
    return activity.notes || null;
}

// key was added to Temporal component to force the years to not safe
function Temporal({key, activities, svgRef}) {
    const [hovered, setHovered] = useState(null);
    const [fromYear, setFromYear] = useState(null);
    const [toYear, setToYear] = useState(null);

    if (!activities || activities.length === 0) {
        return <p>No activity history yet.</p>;
    }



    const categories = [...new Set(activities.map(a => a.activity_type))];

    const dates = activities.flatMap(a => a.ended_on ? [new Date(a.occurred_on), new Date(a.ended_on)]
        : [new Date(a.occurred_on)]);
    const rawMinDate = new Date(Math.min(...dates));
    const rawMaxDate = new Date(Math.max(...dates));
    const today = new Date();

    // edge case where today is earlier than the earliest activity, e.g. if all activities are in the future
    const firstYear = Math.min(rawMinDate.getFullYear(), today.getFullYear());
    const lastYear = Math.max(rawMaxDate.getFullYear(), today.getFullYear());

    const rangeStartYear = fromYear ?? firstYear;
    const rangeEndYear = toYear ?? lastYear;

    const minDate = new Date(rangeStartYear, 0, 1);
    const maxDate = new Date(rangeEndYear, 11, 31);

    const years = [];
    for (let y = rangeStartYear; y <= rangeEndYear; y++) {
        years.push(y);
    }

    const yearOptions = [];
    for (let y = firstYear; y <= lastYear; y++) {
        yearOptions.push(y);
    }

    const visible = activities.filter(a => {
        const start = new Date(a.occurred_on);
        const end = a.ended_on ? new Date(a.ended_on) : start;
        return start <= maxDate && end >= minDate;
    });

    const chartLeft = 200;   // reserved for category labels
    const chartRight = 900;  // reserved for right margin
    const rowHeight = 90;    // vertical space per category row
    const chartWidth = 940;  // total width of the chart
    const chartHeight = categories.length * rowHeight + 60;


    function showTooltip(e, activity) {
        const rect = e.target.closest('.temporal-wrapper').getBoundingClientRect();
        setHovered({
            activity,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }

    function handleToChange(e) {
        const value = Number(e.target.value);
        setToYear(value);
        if (value < rangeStartYear) {
            setFromYear(value);
        }
    }

    function handleFromChange(e) {
        const value = Number(e.target.value);
        setFromYear(value);
        if (value > rangeEndYear) {
            setToYear(value);
        }
    }


    return (
        <>
            <div className="temporal-range">
                <label>From
                    <select value={rangeStartYear} onChange={handleFromChange}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </label>
                <label>To
                    <select value={rangeEndYear} onChange={handleToChange}>
                        {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </label>
                <button
                    className="range-reset"
                    onClick={() => {
                        setFromYear(null);
                        setToYear(null);
                    }}
                    disabled={fromYear === null && toYear === null}
                >Reset
                </button>
            </div>
            <div className="temporal-wrapper">
                <svg ref={svgRef} width={chartWidth} height={chartHeight} className="temporal-svg">
                    {/* year axis */}
                    {years.map(year => {
                        const x = dateToX(new Date(`${year}-01-01`), minDate, maxDate, chartLeft, chartRight);
                        return (
                            <text key={year} x={x} y={20} className="temporal-year-label">
                                {year}
                            </text>
                        );
                    })}

                    {/* today marker */}
                    {today >= minDate && today <= maxDate && (
                        <line
                            x1={dateToX(today, minDate, maxDate, chartLeft, chartRight)}
                            x2={dateToX(today, minDate, maxDate, chartLeft, chartRight)}
                            y1={30}
                            y2={chartHeight}
                            className="temporal-today-line"
                        />
                    )}

                    {/* category rows */}
                    {categories.map((cat, i) => {
                        const y = 50 + i * rowHeight + rowHeight / 2;
                        const meta = CATEGORY_META[cat] || {label: cat, color: '#999'};

                        return (
                            <g key={cat}>
                                <text x={0} y={y} className="temporal-category-label">{meta.label}</text>
                                <text x={0} y={y + 18} className="temporal-category-count">
                                    {visible.filter(a => a.activity_type === cat).length} events
                                </text>
                                <line x1={chartLeft} x2={chartRight} y1={y} y2={y} className="temporal-row-line"/>

                                {/* events in this row */}
                                {visible.filter(a => a.activity_type === cat)
                                    .map(a => {
                                        const x = dateToX(a.occurred_on, minDate, maxDate, chartLeft, chartRight);

                                        if (a.ended_on) {
                                            // duration bar for research awards or other multi-day events
                                            const xEnd = dateToX(a.ended_on, minDate, maxDate, chartLeft, chartRight);
                                            return (
                                                <g key={a.id}>
                                                    <rect x={x} y={y - 12} width={xEnd - x} height={24} rx={6}
                                                          className="temporal-bar"
                                                          style={{fill: meta.color + '33', stroke: meta.color}}
                                                          onMouseEnter={(e) => showTooltip(e, a)}
                                                          onMouseMove={e => showTooltip(e, a)}
                                                          onMouseLeave={() => setHovered(null)}
                                                    />
                                                    {a.amount && (
                                                        <text x={x} y={y - 18} className="temporal-amount-label">
                                                            ${Math.round(a.amount / 1000)}K
                                                        </text>
                                                    )}
                                                </g>
                                            );
                                        }

                                        return (
                                            <circle key={a.id} cx={x} cy={y} r={7} style={{fill: meta.color}}
                                                    className="temporal-dot"
                                                    onMouseEnter={e => showTooltip(e, a)}
                                                    onMouseMove={e => showTooltip(e, a)}
                                                    onMouseLeave={() => setHovered(null)}
                                            />
                                        );
                                    })}
                            </g>
                        );
                    })}
                </svg>

                {hovered && (() => {
                    const meta = CATEGORY_META[hovered.activity.activity_type] || {
                        label: hovered.activity.activity_type,
                        color: '#999'
                    };
                    return (
                        <div className="temporal-tooltip" style={{left: hovered.x + 20, top: hovered.y + 70}}>
                            <div className="temporal-tooltip-header">
                                <span className="temporal-tooltip-dot" style={{background: meta.color}}/>
                                <span className="temporal-tooltip-title">{tooltipTitle(hovered.activity, meta)}</span>
                            </div>
                            <div className="temporal-tooltip-desc">
                                {tooltipDescription(hovered.activity) || meta.label}
                            </div>
                            {hovered.activity.amount && (
                                <div className="temporal-tooltip-amount">
                                    ${Number(hovered.activity.amount).toLocaleString()}
                                </div>
                            )}
                            <div className="temporal-tooltip-date">
                                {formatMonthYear(hovered.activity.occurred_on)}
                            </div>
                        </div>
                    );
                })()}
            </div>
        </>
    );
}

export default Temporal;