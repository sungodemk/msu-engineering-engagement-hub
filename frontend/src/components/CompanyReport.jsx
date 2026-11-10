// Zhixiang Miao

import { Document, Page, Text, Font, View, StyleSheet } from '@react-pdf/renderer';

Font.registerHyphenationCallback((word) => [word]);
const GREEN = '#18453B';
const MUTED = '#6b7378';
const LINE = '#e3e6e8';

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const fmtDate = (iso) => {
    if (!iso) return '';
    const[year, month, day] = iso.split('-');
    return `${MONTHS[parseInt(month)-1]} ${day}, ${year}`;
};

const fmtMoney = (n) => (n == null ? '':
    parseFloat(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const humanize = (v) => {
    const t = (v||'').replaceAll('_', ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);

}

const styles = StyleSheet.create({
    page: {paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica',  color: '#1d2327', lineHeight: 1.4},
    brand: {fontSize: 16, fontWeight: 'bold', color: GREEN, marginBottom: 8},
    header: {fontSize: 12, fontWeight: 'bold', color: GREEN, marginBottom: 4},
    name: {fontSize: 20, fontWeight: 'bold', color: GREEN, marginBottom: 15},
    subheader: {fontSize: 10, fontWeight: 'bold', color: MUTED, marginBottom: 4},
    metaRow: {flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: 12, paddingBottom: 8, borderBottomWidth: 1.5, borderBottomColor: GREEN,},
    metaItem: {width: '33.33%', paddingRight: 8, marginBottom: 8 },
    metaLabel: {fontSize: 7.5, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1},
    metaValue: {fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#1d2327'},
    flags: {flexDirection: 'row', marginTop: 6},
    flag: {fontSize: 10, color: MUTED, marginRight: 8},
    section: {marginTop: 16, marginBottom: 8},
    sectionTitle: {fontSize: 12, fontWeight: 'bold', color: GREEN, marginBottom: 4},
    thead: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, borderBottomStyle: 'solid', marginBottom: 4},
    th: {fontSize: 10, fontWeight: 'bold', color: GREEN, paddingRight: 6},
    row: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: LINE, borderBottomStyle: 'solid', marginBottom: 4},
    cell: {fontSize: 10, color: '#1d2327', paddingRight: 6},
    empty: {fontSize: 10, color: MUTED, fontStyle: 'italic', flex: 1},
    item: {marginBottom: 4},
    itemHead: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2},
    itemTitle: {fontFamily: 'Helvetica-Bold'},
    itemMeta: {fontSize: 9, color: MUTED, marginBottom: 2},
    body: {fontSize: 9, color: '#1d2327', marginBottom: 2},
    footer: {position: 'absolute', bottom: 24, left: 44, right: 44, fontSize: 10, color: MUTED, textAlign: 'center', flexDirection: 'row', justifyContent:'space-between'},
});

function Section({ title, children }) {
    return (
        <View style={styles.section}>
            <Text style={styles.sectionTitle} minPresenceAhead={40}>
                {title}
            </Text>
            {children}
        </View>
    );
}

function Table({ columns, rows, empty }) {
    if (!rows.length) return <Text style={styles.empty}>{empty}</Text>;

    return (
        <View>
            <View style={styles.thead}>
                {columns.map((c) => (
                    <Text key={c.label} style={[styles.th, styles.cell, { width: c.width }]}>
                        {c.label}
                    </Text>
                ))}
            </View>
            {rows.map((r, i) => (
                <View key={i} style={styles.row} wrap={false}>
                    {columns.map((c) => {
                        const value = c.value(r);
                        return (
                            <Text key={`${i}-${c.label}`} style={[styles.cell, { width: c.width }]}>
                                {value == null || value === '' ? '--' : value}
                            </Text>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

function CompanyReport({ company, owner, c_contacts = [], activities = [], capstones = [], research_awards = [] }) {
    const s = styles;
    const location = [company.city, company.state].filter(Boolean).join(', ');

    const summary = {};
    for (const a of activities) {
        const type = a.activity_type;
        if (!type) continue;
        const eventDate = a.activity_occurred_on ?? null;
        summary[type] ??= { count: 0, latest: eventDate ?? null };
        summary[type].count += 1;
        if (eventDate && (!summary[type].latest || eventDate > summary[type].latest)) {
            summary[type].latest = eventDate;
        }
    }

    const openAsks = activities.filter((a) => a.activity_type === 'ask' && a.activity_status === 'open').length;
    const giving = activities.filter((a) => a.activity_type === 'gift' || a.activity_type === 'Donation' || a.activity_type ==='Pledge').reduce((t, a) => parseFloat(t) + parseFloat(a.activity_amount ?? 0), 0);
    const printed = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <Document title={`${company.display_name} - Engagement Report`} author="MSU Engineering Engagement Hub">
            <Page size="LETTER" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.brand}>Michigan State University - Company Report</Text>
                    <Text style={styles.name}>{company.display_name}</Text>
                    {company.industry ? <Text style={s.subheader}>{company.industry}</Text> : null}
                    {company.industry_detail ? <Text style={s.subheader}>{company.industry_detail}</Text> : null}
                    <View style={styles.metaRow}>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Last Contact Date</Text>
                            <Text style={s.metaValue}>{fmtDate(company.latest_contact_date) || 'None'}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Location</Text>
                            <Text style={s.metaValue}>{location || 'Not Found'}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Owner</Text>
                            <Text style={s.metaValue}>{owner || 'No availble'}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Open Asks</Text>
                            <Text style={s.metaValue}>{String(openAsks)}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Total Giving</Text>
                            <Text style={s.metaValue}>{fmtMoney(giving)}</Text>
                        </View>
                    </View>
                </View>

                {capstones.length > 0 && (
                    <Section title="Capstone Projects">
                        {capstones.map((c) => (
                            <View key={c.id} style={styles.item} wrap={false}>
                                <View style={styles.itemHead}>
                                    <Text style={styles.itemTitle}>{c.title}{c.status ? ` - ${c.status}` : ''}</Text>
                                    <Text style={styles.itemMeta}>{c.semester ?? ''}</Text>
                                </View>

                                {c.notes ? <Text style={s.body}>{c.notes}</Text> : null}
                                {fmtMoney(c.amount) ? <Text style={s.body}>{fmtMoney(c.amount)}</Text> : null}
                            </View>
                        ))}
                    </Section>
                )}

                <Section title="Engagement Summary">
                    <Table
                        rows={Object.entries(summary)}
                        empty="No Engagement Summary"
                        columns={[
                            { label: 'Type', width: '50%', value: ([type]) => humanize(type) },
                            { label: 'Count', width: '20%', value: ([, r]) => String(r.count) },
                            { label: 'Most Recent', width: '30%', value: ([, r]) => fmtDate(r.latest) },
                        ]}
                    />
                </Section>

                <Section title="Company Contacts">
                    <Table
                        rows={c_contacts}
                        empty="No contacts on record."
                        columns={[
                            { label: 'Organization', width: '40%', value: (a) => a.display_name },
                            { label: 'Title', width: '40%', value: (a) => a.title },
                            { label: 'Contact Email', width: '20%', value: (a) => a.email },
                        ]}
                    />
                </Section>

                <Section title="Activity History">
                    <Table
                        rows={activities}
                        empty="No activity history on record"
                        columns={[
                            { label: 'Date', width: '15%', value: (a) => fmtDate(a.activity_occurred_on ?? null) },
                            { label: 'Type', width: '13%', value: (a) => humanize(a.activity_type) },
                            { label: 'Status', width: '22%', value: (a) => a.activity_status },
                            { label: 'Amount', width: '12%', value: (a) => (a.activity_amount != null ? fmtMoney(a.activity_amount) : '') },
                            { label: 'Details', width: '38%', value: (a) => a.activity_notes },
                        ]}
                    />
                </Section>

                <Section title="Research Awards">
                    <Table
                        rows={research_awards}
                        empty="No research awards on record"
                        columns={[
                            { label: 'Title', width: '25%', value: (a) => a.title }, 
                            { label: 'PI', width: '15%', value: (a) => (a.pi ?? null) }, 
                            { label: 'Total Amount', width: '15%', value: (a) => fmtMoney(a.total_amount ?? null) },
                            { label: 'Lead Unit', width: '15%', value: (a) => (a.lead_unit ?? null) }, 
                            { label: 'Status', width: '15%', value: (a) => a.status},
                            { label: 'Research Date', width: '15%', value: (a) => fmtDate(a.date ?? null) },
                        ]}
                    />
                </Section>

                <View style={s.footer} fixed>
                    <Text>{company.display_name} - Printed {printed}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}

export default CompanyReport;