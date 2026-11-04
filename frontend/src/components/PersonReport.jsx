/* Author: Emmanuel Koshy */
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
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }));
const humanize = (v) => {
    const t = (v||'').replaceAll('_', ' ');
    return t.charAt(0).toUpperCase() + t.slice(1);

}

const styles = StyleSheet.create({
    page: {paddingTop: 40, paddingBottom: 56, paddingHorizontal: 44, fontSize: 10, fontFamily: 'Helvetica',  color: '#1d2327', lineHeight: 1.4},
    brand: {fontSize: 16, fontWeight: 'bold', color: GREEN, marginBottom: 8},
    header: {fontSize: 12, fontWeight: 'bold', color: GREEN, marginBottom: 4},
    name: {fontSize: 20, fontWeight: 'bold', color: GREEN, marginBottom: 4},
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
            <View style={styles.thead} fixed>
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

function PersonReport({ data, notes = [] }) {
    const {
        person = {},
        current_affiliation: currentAffiliation,
        affiliations = [],
        activities = [],
        owner,
        degrees = [],
        capstones = [],
    } = data ?? {};
    const s = styles;
    const attrs = person.attributes ?? {};
    const current = currentAffiliation;
    const title = current?.title ?? attrs.title;
    const location = [attrs.city, attrs.state].filter(Boolean).join(', ');
    const flags = [
        attrs.deceased && 'Deceased',
        attrs.do_not_contact && 'Do Not Contact',
        attrs.do_not_solicit && 'Do Not Solicit',
    ].filter(Boolean);

    const summary = {};
    for (const a of activities) {
        const type = a.activity_type;
        if (!type) continue;
        const eventDate = a.occurred_on ?? a.occured_on;
        summary[type] ??= { count: 0, latest: eventDate ?? null };
        summary[type].count += 1;
        if (eventDate && (!summary[type].latest || eventDate > summary[type].latest)) {
            summary[type].latest = eventDate;
        }
    }

    const openAsks = activities.filter((a) => a.activity_type === 'ask' && a.status === 'open').length;
    const giving = activities.filter((a) => a.activity_type === 'gift').reduce((t, a) => t + (a.amount ?? 0), 0);
    const ownerText = owner
        ? `${owner.name}${owner.source === 'company' ? `(via ${current?.company ?? 'company'})` : owner.role ? ` (${owner.role})` : ''}`
        : 'Not assigned';
    const printed = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <Document title={`${person.display_name} - Engagement Report`} author="MSU Engineering Engagement Hub">
            <Page size="LETTER" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.brand}>Michigan State University - Person Report</Text>
                    <Text style={styles.name}>{person.display_name}</Text>
                    {title ? <Text style={s.subheader}>{title}{current ? ` - ${current.company}` : ''}</Text> : null}
                    {flags.length > 0 && (
                        <View style={styles.flags}>
                            {flags.map((f) => (
                                <Text key={f} style={styles.flag}>
                                    {f}
                                </Text>
                            ))}
                        </View>
                    )}
                    <View style={styles.metaRow}>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Email</Text>
                            <Text style={s.metaValue}>{person.email || 'None'}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Location</Text>
                            <Text style={s.metaValue}>{location || 'Not Found'}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>MSU Relationship Owner</Text>
                            <Text style={s.metaValue}>{ownerText}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Open Asks</Text>
                            <Text style={s.metaValue}>{String(openAsks)}</Text>
                        </View>
                        <View style={s.metaItem}>
                            <Text style={s.metaLabel}>Lifetime Giving</Text>
                            <Text style={s.metaValue}>{fmtMoney(giving)}</Text>
                        </View>
                    </View>
                </View>

                {degrees.length > 0 && (
                    <Section title="Alumni Record">
                        <Table
                            rows={degrees}
                            columns={[
                                { label: 'Degree', width: '45%', value: (d) => [d.degree_type, d.major].filter(Boolean).join(' in ') },
                                { label: 'College', width: '40%', value: (d) => d.college },
                                { label: 'Class Year', width: '15%', value: (d) => d.class_year && String(d.class_year) },
                            ]}
                            empty="No degrees found"
                        />
                    </Section>
                )}

                {capstones.length > 0 && (
                    <Section title="Capstone Projects">
                        {capstones.map((c) => (
                            <View key={c.id} style={styles.item} wrap={false}>
                                <View style={styles.itemHead}>
                                    <Text style={styles.itemTitle}>{c.title}{c.status ? ` - ${c.status}` : ''}</Text>
                                    <Text style={styles.itemMeta}>{c.semester ?? ''}</Text>
                                </View>
                                <Text style={s.itemMeta}>
                                    {c.company || 'No company'}{c.role ? ` - ${c.role}` : ''}{c.mentor ? ` - Mentor: ${c.mentor}` : ''}
                                </Text>
                                {c.notes ? <Text style={s.body}>{c.notes}</Text> : null}
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

                <Section title="Affiliation History">
                    <Table
                        rows={affiliations}
                        empty="No employment history on record."
                        columns={[
                            { label: 'Organization', width: '40%', value: (a) => a.company },
                            { label: 'Title', width: '40%', value: (a) => a.title },
                            { label: 'Years', width: '20%', value: (a) => `${a.valid_from?.slice(0, 4) ?? ''} - ${a.last_day?.slice(0, 4) ?? 'present'}` },
                        ]}
                    />
                </Section>

                <Section title="Activity History">
                    <Table
                        rows={activities}
                        empty="No activity history on record"
                        columns={[
                            { label: 'Date', width: '15%', value: (a) => fmtDate(a.occurred_on ?? a.occured_on) },
                            { label: 'Type', width: '13%', value: (a) => humanize(a.activity_type) },
                            { label: 'Organization', width: '22%', value: (a) => a.company },
                            { label: 'Amount', width: '12%', value: (a) => (a.amount != null ? fmtMoney(a.amount) : '') },
                            { label: 'Details', width: '38%', value: (a) => a.notes },
                        ]}
                    />
                </Section>

                <Section title="Notes">
                    {notes.length === 0 ? (
                        <Text style={s.empty}>No notes.</Text>
                    ) : (
                        notes.map((n) => (
                            <View key={n.id} style={s.item} wrap={false}>
                                <View style={s.itemHead}>
                                    <Text style={s.itemTitle}>{n.title}</Text>
                                    <Text style={s.itemMeta}>{fmtDate(n.note_date)}{n.author ? ` - ${n.author}` : ''}</Text>
                                </View>
                                {n.body ? <Text style={s.body}>{n.body}</Text> : null}
                            </View>
                        ))
                    )}
                </Section>

                <View style={s.footer} fixed>
                    <Text>{person.display_name} - Printed {printed}</Text>
                    <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
                </View>
            </Page>
        </Document>
    );
}

export default PersonReport;
                           