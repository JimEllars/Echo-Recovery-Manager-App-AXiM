const fs = require('fs');
let code = fs.readFileSync('src/hooks/useEchoData.js', 'utf8');

const searchState = `  const [records, setRecords] = useState([]);`;
const replaceState = `  const [records, setRecords] = useState(() => {
    try {
      const stored = sessionStorage.getItem('echo_records');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      if (records.length > 0) {
        sessionStorage.setItem('echo_records', JSON.stringify(records));
      }
    } catch (e) {
      console.error('Failed to save to sessionStorage', e);
    }
  }, [records]);`;
code = code.replace(searchState, replaceState);

fs.writeFileSync('src/hooks/useEchoData.js', code);
