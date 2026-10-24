import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import '../css/relationship.css';

cytoscape.use(fcose);

const TYPE_COLORS = {
    company: '#3b7a9c',
    msu_unit: '#18453B',
    staff: '#e2a73b',
    contact: '#2b4fd6',
};

const TYPE_LABELS = {
    company: 'Company',
    msu_unit: 'MSU Units',
    staff: 'MSU Staff',
    contact: 'Contacts',
};

// data = { nodes: [{id, label, type}], edges: [{source, target, label}] }
function RelationshipGraph({data}) {
    const containerRef = useRef(null);
    const [selected, setSelected] = useState(null);

    // Get nodes and edges from data and create cytoscape graph
        useEffect(() => {
        const elements = [...data.nodes.map(n => ({
            data: { id: n.id, label: n.label, type: n.type },
            })), ...data.edges.map(e => ({
                data: { source: e.source, target: e.target, label: e.label },
            })),
        ];

        // May change styles to accommodate for msu staff usability and aesthetics
        const cy = cytoscape({
            container: containerRef.current,
            elements,
            style: [
                {
                    // company and units
                    selector: 'node',
                    style: {
                        label: 'data(label)',
                        color: '#fff',
                        'font-size': '10px',
                        'text-wrap': 'wrap',
                        'text-max-width': '116px',
                        'text-valign': 'center',
                        'text-halign': 'center',
                        width: 130,
                        height: 60,
                        shape: 'round-rectangle',
                        'background-color': '#999',
                    },
                },
                {
                    selector: 'node[type = "company"]',
                    style: { 'background-color': TYPE_COLORS.company, color: '#ffffff' },
                },
                {
                    selector: 'node[type = "msu_unit"]',
                    style: { 'background-color': TYPE_COLORS.msu_unit },
                },
                {
                    selector: 'node[type = "staff"]',
                    style: {
                        'background-color': TYPE_COLORS.staff,
                        shape: 'diamond',
                        height: 50
                    },
                },
                {
                    selector: 'node[type = "contact"]',
                    style: {
                        'background-color': TYPE_COLORS.contact,
                        shape: 'ellipse',
                        height: 50,
                    },
                },
                {
                    selector: 'edge',
                    style: {
                        width: 1,
                        'line-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'target-arrow-shape': 'triangle',
                        'curve-style': 'bezier',
                        label: 'data(label)',
                        'font-size': '8px',
                        color: '#777',
                        'edge-text-rotation': 'autorotate',
                        'text-background-color': '#fff',
                        'text-background-opacity': 1,
                        'text-background-padding': '2px',
                    },
                },
                {
                    selector: 'node:selected',
                    style: { 'border-width': 3, 'border-color': '#90EE90' },
                },
            ],
        });
        // May change layout to accommodate for msu staff usability and aesthetics
        cy.resize();
        cy.layout({
            name: 'fcose',
            animate: true,
            randomize: true,
            fit: true,
            padding: 40,
            nodeDimensionsIncludeLabels: true,
            idealEdgeLength: 140,
            nodeRepulsion: 12000,
            nodeSeparation: 120,
        }).run();

        cy.on('tap', 'node', evt => {
            const node = evt.target;
            const connections = node
                .connectedEdges()
                .connectedNodes()
                .not(node)
                .map(n => ({ id: n.id(), label: n.data('label'), type: n.data('type') }));

            setSelected({
                id: node.id(),
                label: node.data('label'),
                type: node.data('type'),
                connections,
            });
        });

        cy.on('tap', evt => {
            if (evt.target === cy) {
                setSelected(null);
            }
        });

        return () => cy.destroy();
    }, [data]);

    const counts = data.nodes.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
    }, {});

    return (
        <div className="graph-layout">
            <div className="graph-card">
                <div className="graph-legend">
                    {Object.entries(TYPE_COLORS).map(([type, color]) => (
                        <span key={type} className="legend-item">
                            <span className="legend-list" style={{ background: color }} />
                            {TYPE_LABELS[type]}
                        </span>
                    ))}
                    <span className="legend-meta">
                        {data.nodes.length} nodes - {data.edges.length} edges - scroll to zoom - click and drag
                    </span>
                </div>
                <div ref={containerRef} className="graph-canvas" />
            </div>

            <div className="graph-side">
                { /* Display what's connected to selected node */ }
                <div className="graph-side-card">
                    {selected ? (
                        <>
                            <div className="selected-label">{selected.label}</div>
                            <div className="selected-type">{TYPE_LABELS[selected.type]}</div>
                            <div className="connected-title">Connected To ({selected.connections.length})</div>
                            {selected.connections.map(c => (
                                <div key={c.id} className="connected-item">{c.label}</div>
                            ))}
                            <button className="clear-button" onClick={() => setSelected(null)}>
                                Clear selection
                            </button>
                        </>
                    ) : (
                        <p className="empty-text">Click a node to view its relationships.</p>
                    )}
                </div>
                <div className="graph-side-card">
                    {Object.entries(counts).map(([type, count]) => (
                        <div key={type} className="stat-row">
                            <span>{TYPE_LABELS[type]}</span>
                            <span>{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default RelationshipGraph;