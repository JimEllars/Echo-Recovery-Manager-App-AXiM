const fs = require('fs');
let code = fs.readFileSync('src/components/DlqAggregationFeed.jsx', 'utf8');

const search = `                onClick={() => {
                  if (record.status !== 'replaying') {
                    onRowClick(record);
                  }
                }}`;

const replace = `                onClick={() => {
                  if (record.status !== 'replaying') {
                    if (setIsFeedPaused) setIsFeedPaused(true);
                    onRowClick(record);
                  }
                }}`;

code = code.replace(search, replace);
fs.writeFileSync('src/components/DlqAggregationFeed.jsx', code);
