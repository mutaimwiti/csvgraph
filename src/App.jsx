import { useState } from 'react';
import Plot from 'react-plotly.js';
import Papa from 'papaparse';

const scalingOptions = [
  { value: 0.001, label: '/1000' },
  { value: 0.01, label: '/100' },
  { value: 0.1, label: '/10' },
  { value: 1, label: 'x1' },
  { value: 10, label: 'x10' },
  { value: 100, label: 'x100' },
  { value: 1000, label: 'x1000' },
];

const isPercentageField = (fieldName) => {
  const lowerFieldName = fieldName.toLowerCase();
  return lowerFieldName.includes('percent') || lowerFieldName.includes('%');
};

const calculateScalingFactor = (maxValue, fieldName) => {
  if (isPercentageField(fieldName)) return 0.01;
  if (maxValue === 0) return 1;
  if (maxValue >= 1000) return 0.001;
  if (maxValue > 100 && maxValue <= 1000) return 0.001;
  if (maxValue > 50 && maxValue <= 100) return 0.01;
  if (maxValue > 10 && maxValue <= 50) return 0.1;
  if (maxValue > 1 && maxValue <= 10) return 1;
  return 1;
};

const App = () => {
  const [csvData, setCsvData] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [scalingFactors, setScalingFactors] = useState({});
  const [data, setData] = useState([]);
  const [xAxisField, setXAxisField] = useState('');
  const [xAxisScalingFactor, setXAxisScalingFactor] = useState(1);
  const [showForm, setShowForm] = useState(true);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFileName(file.name.split('.').slice(0, -1).join('.')); // Remove file extension
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        const csvData = result.data.map(row => {
          const newRow = {};
          for (const key in row) {
            newRow[key] = isNaN(row[key]) ? row[key] : Number(row[key]);
          }
          return newRow;
        });
        setCsvData(csvData);
        const fieldNames = Object.keys(csvData[0]);
        setFields(fieldNames);

        // Auto-determine scaling factors
        const newScalingFactors = {};
        fieldNames.forEach(field => {
          const maxValue = Math.max(...csvData.map(row => isNaN(row[field]) ? 0 : row[field]));
          newScalingFactors[field] = calculateScalingFactor(maxValue, field);
        });
        setScalingFactors(newScalingFactors);
      }
    });
  };

  const handleFieldChange = (field) => {
    setSelectedFields((prev) => 
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleScalingChange = (field, factor) => {
    if (field === xAxisField) {
      setXAxisScalingFactor(factor);
    } else {
      setScalingFactors((prev) => ({ ...prev, [field]: factor }));
    }
  };

  const handleXAxisFieldChange = (field) => {
    setXAxisField(field);
    setXAxisScalingFactor(scalingFactors[field] || 1);
  };

  const formatScalingFactor = (factor) => {
    if (factor === 1) return '';
    return ` / ${1 / factor}`;
  };

  const generateGraph = () => {
    if (!xAxisField) {
      alert('Please select an X-Axis field.');
      return;
    }

    const xAxisNormalizationFactor = xAxisScalingFactor;

    const plotData = selectedFields.map((field) => {
      const yAxisNormalizationFactor = scalingFactors[field] || 1;
      return {
        x: csvData.map((row) => !isNaN(row[xAxisField]) ? row[xAxisField] * xAxisNormalizationFactor : null).filter(v => v !== null),
        y: csvData.map((row) => !isNaN(row[field]) ? row[field] * yAxisNormalizationFactor : null).filter(v => v !== null),
        mode: 'lines',
        name: `${field}${formatScalingFactor(yAxisNormalizationFactor)}`,
      };
    });

    setData(plotData);
    setShowForm(false);
  };

  return (
    <div>
      {showForm ? (
          <div style={{ marginLeft: "20px"}}>
            {fileName ? (
                <>
                  <table>
                    <thead>
                    <tr>
                      <th align="left">Field</th>
                      <th align="left">Scale</th>
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                      <td>
                        <select onChange={(e) => handleXAxisFieldChange(e.target.value)} value={xAxisField}>
                          <option value="" disabled>Select X-Axis Field</option>
                          {fields.map((field) => (
                              <option key={field} value={field}>{field}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select onChange={(e) => setXAxisScalingFactor(Number(e.target.value))} value={xAxisScalingFactor}>
                          {scalingOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                    {fields.filter(field => field !== xAxisField).map((field) => (
                        <tr key={field}>
                          <td>
                            <input
                                type="checkbox"
                                checked={selectedFields.includes(field)}
                                onChange={() => handleFieldChange(field)}
                            />
                            <label>{field}</label>
                          </td>
                          <td>
                            <select onChange={(e) => handleScalingChange(field, Number(e.target.value))} value={scalingFactors[field] || 1}>
                              {scalingOptions.map((option) => (
                                  <option key={option.value} value={option.value}>{option.label}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                  <button onClick={generateGraph} style={{ background: "blue", color: "white", margin: "5px" }}>Generate</button>
                  <div style={{ margin: "5px"}}>
                    <a href="/">Select another file</a>
                  </div>
                </>
            ) : (
                <input type="file" onChange={handleFileUpload} />
            )}
          </div>
      ) : (
        <div id="fullScreenPlot" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'white', zIndex: 9999 }}>
          <Plot
            data={data}
            layout={{ title: fileName, autosize: true }}
            style={{ width: '100%', height: '100%' }}
          />
          <button onClick={() => setShowForm(true)} style={{ position: 'fixed', bottom: 20, right: 20, background: "red", color: "white" }}>Select fields</button>
        </div>
      )}
    </div>
  );
};

export default App;
