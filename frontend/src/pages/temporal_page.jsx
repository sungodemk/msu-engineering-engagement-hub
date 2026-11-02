import { useEffect, useState, useRef } from 'react';
import { jsPDF } from "jspdf";
import Temporal from '../graphs/temporal';
import '../css/graph_page.css';


// have to inline styles for the svg to be exported as pdf
const STYLES = [
    'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
    'stroke-dasharray', 'opacity', 'font-family', 'font-size', 'font-weight',
    'font-style', 'text-anchor', 'dominant-baseline', 'letter-spacing',
];

// copy styles from source to target recursively
function inlineStyles(source, target) {
    const computed = window.getComputedStyle(source);
    STYLES.forEach(p => target.style.setProperty(p, computed.getPropertyValue(p)));
    Array.from(source.children).forEach((child, i) => inlineStyles(child, target.children[i]));
}

function TemporalPage() {

    const [companies, setCompanies] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [company, setCompany] = useState(null);
    const [activities, setActivities] = useState([]);
    const svgRef = useRef(null);

    // fetch the dropdown list
    useEffect(() => {
        fetch('http://localhost:8080/api/companies')
            .then(res => res.json())
            .then(setCompanies);
    }, []);

    useEffect(() => {
        if (!selectedId) return;

        fetch(`http://localhost:8080/api/companies/${selectedId}`)
            .then(res => res.json())
            .then(setCompany);

        fetch(`http://localhost:8080/api/companies/${selectedId}/temporal`)
            .then(res => res.json())
            .then(setActivities);
    }, [selectedId]);

    function handleChange(e) {
        setSelectedId(e.target.value);
    }

    // have to reconstruct the svg and convert it to a canvas to export as pdf
    function exportPDF() {
        const svg = svgRef.current;
        if (!svg) return;

        const width = Number(svg.getAttribute('width'));
        const height = Number(svg.getAttribute('height'));
        const clone = svg.cloneNode(true);
        inlineStyles(svg, clone);
        // have to add the xmlns attribute for the svg to be valid
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        const xml = new XMLSerializer().serializeToString(clone);
        const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);

        const image = new Image();
        image.onload = () => {
            const scale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;

            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#fff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

            const pdf = new jsPDF({
                orientation: width >= height ? 'landscape' : 'portrait',
                unit: 'px',
                format: [width, height],
            });

            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, width, height);
            pdf.save(`${company.display_name} timeline.pdf`);
        };

        image.src = url;
    }

    // Prevent exports with no data
    const canExport = selectedId && activities.length > 0;

    return (
        <div className="graph-page">
            <div className="graph-header">
                <div>
                    <p className="graph-type">Temporal Activity Graph</p>
                    <h1>{company ? company.display_name : 'Select a company'}</h1>
                </div>

                <div className="graph-controls">

                    <button className="export-btn" onClick={exportPDF} disabled={!canExport}>
                        Export PDF
                    </button>

                    <select className="company-select" value={selectedId} onChange={handleChange}>
                    <option value="" disabled>
                        Choose a company…
                    </option>
                    {companies.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.display_name}
                        </option>
                    ))}
                    </select>
                </div>


            </div>
            {selectedId ? (
                <Temporal activities={activities} svgRef={svgRef}/>
            ) : (
                <p className={"graph-empty"}>Select a company to view its temporal activity graph.</p>
            )}
        </div>
    );
}

export default TemporalPage;