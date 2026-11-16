//Emmanuel Koshy
import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import { API_BASE } from '../api.js';


const LINKS = {
    person: (id) => `/persons/${id}`,
    organization: (id) => `/company_page/${id}`,
};


function SidebarSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [open, setOpen] = useState(false);
    
    useEffect(() => {
        const term = query.trim();
        if (term.length < 2) {
            setResults([]);
            return;
        }

        setResults(null);
        let ignored = false;
        const timer = setTimeout(() => {
            fetch(`${API_BASE}/api/search?q=${encodeURIComponent(term)}`)
                .then(response => response.json())
                .then((data) => { if (!ignored) setResults(data); })
                .catch(() => { if (!ignored) setResults([]); });
        }, 200); // Debounce for 200ms

        // Cleanup function to cancel the fetch if the component unmounts or query changes
        return () => {
            ignored = true;
            clearTimeout(timer);
        };
    }, [query]);

    function clear()  {
        setQuery('');
        setResults([]);
        setOpen(false);
    }

    const showDropdown = open && query.trim().length >= 2 ;

    return (
        <div className="sidebar-search-wrap">
            <input  
                className="sidebar-search"
                placeholder="Search for people or companies..."
                type="text"
                value={query}
                onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setOpen(false)}
                onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                        clear();
                    }
                }}
            />

            {showDropdown && (
                // keep input in focus when clicking on the dropdown
                <ul className="search-results" onMouseDown={(e) => e.preventDefault()}>
                    {results === null && <li className="search-empty">Searching...</li>}
                    {results && results.length === 0 && <li className="search-empty">No results found</li>}
                    {results?.map((result) => (
                        <li key={result.id}>
                            <Link to={LINKS[result.type](result.id)} onClick={clear}>
                                <span>{result.type === 'person' ? '👤' : '🏢'}</span>
                                {result.name}
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default SidebarSearch;
