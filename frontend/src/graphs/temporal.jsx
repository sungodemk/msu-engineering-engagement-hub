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
    return chartLeft + ratio * (chartRight - chartLeft);
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

function Temporal({activities}) {
    const [hovered, setHovered] = useState(null);

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

    const minDate = new Date(firstYear, 0, 1);
    // if the latest activity is in the future, extend the chart to the end of that year
    const maxDate = new Date(lastYear, 11, 31);

    const chartLeft = 200;   // reserved for category labels
    const chartRight = 900;  // reserved for right margin
    const rowHeight = 90;    // vertical space per category row
    const chartWidth = 940;  // total width of the chart
    const chartHeight = categories.length * rowHeight + 60;

    // build year tick marks along the top
    const startYear = minDate.getFullYear();
    const endYear = maxDate.getFullYear();
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
        years.push(y);
    }

    function showTooltip(e, activity) {
        const rect = e.target.closest('.temporal-wrapper').getBoundingClientRect();
        setHovered({
            activity,
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        });
    }


    return (
        <div className="temporal-wrapper">
            <svg width={chartWidth} height={chartHeight} className="temporal-svg">
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
                <line
                    x1={dateToX(today, minDate, maxDate, chartLeft, chartRight)}
                    x2={dateToX(today, minDate, maxDate, chartLeft, chartRight)}
                    y1={30}
                    y2={chartHeight}
                    className="temporal-today-line"
                />

                {/* category rows */}
                {categories.map((cat, i) => {
                    const y = 50 + i * rowHeight + rowHeight / 2;
                    const meta = CATEGORY_META[cat] || {label: cat, color: '#999'};

                    return (
                        <g key={cat}>
                            <text x={0} y={y} className="temporal-category-label">{meta.label}</text>
                            <text x={0} y={y + 18} className="temporal-category-count">
                                {activities.filter(a => a.activity_type === cat).length} events
                            </text>
                            <line x1={chartLeft} x2={chartRight} y1={y} y2={y} className="temporal-row-line"/>

                            {/* events in this row */}
                            {activities
                                .filter(a => a.activity_type === cat)
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
                const meta = CATEGORY_META[hovered.activity.activity_type] || {label: hovered.activity.activity_type, color: '#999'};
                return (
                    <div className="temporal-tooltip" style={{left: hovered.x + 20, top: hovered.y + 20}}>
                        <div className="temporal-tooltip-header">
                            <span className="temporal-tooltip-dot" style={{background: meta.color}} />
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
    );
}

export default Temporal;