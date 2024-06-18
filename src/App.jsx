import { useState } from 'react';
import Plot from 'react-plotly.js';
import Papa from 'papaparse';
import { toPng } from 'html-to-image';
import download from 'downloadjs';

const scalingOptions = [
  { value: 0.001, label: '/1000' },
  { value: 0.01, label: '/100' },
  { value: 0.1, label: '/10' },
  { value: 1, label: 'x1' },
  { value: 10, label: 'x10' },
  { value: 100, label: 'x100' },
  { value: 1000, label: 'x1000' },
];

const App = () => {
  const [csvData, setCsvData] = useState([]);
  const [fields, setFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [scalingFactors, setScalingFactors] = useState({});
  const [data, setData] = useState([]);
  const [xAxisField, setXAxisField] = useState('');
  const [xAxisScalingFactor, setXAxisScalingFactor] = useState(1);
  const [showForm, setShowForm] = useState(true);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFileName(file.name.split('.').slice(0, -1).join('.')); // Remove file extension
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (result) => {
        const csvData = result.data;
        setCsvData(csvData);
        const fieldNames = Object.keys(csvData[0]);
        setFields(fieldNames);
      }
    });
  };

  const handleFieldChange = (field) => {
    setSelectedFields((prev) => 
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field]
    );
  };

  const handleScalingChange = (field, factor) => {
    setScalingFactors((prev) => ({ ...prev, [field]: factor }));
  };

  const formatScalingFactor = (factor) => {
    if (factor === 1) return '';
    return ` (/ ${1 / factor})`;
  };

  const generateGraph = () => {
    if (!xAxisField) {
      alert('Please select an X-Axis field.');
      return;
    }

    const plotData = selectedFields.map((field) => ({
      x: csvData.map((row) => row[xAxisField] * xAxisScalingFactor),
      y: csvData.map((row) => row[field] * (scalingFactors[field] || 1)),
      mode: 'lines',
      name: `${field}${formatScalingFactor(scalingFactors[field] || 1)}`,
    }));

    setData(plotData);
    setShowForm(false);
  };

  const downloadImage = () => {
    const node = document.getElementById('plot');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-'); // Create a timestamp

    toPng(node, { pixelRatio: 2 })  // Increase pixelRatio for higher resolution
      .then((dataUrl) => {
        download(dataUrl, `${fileName}-${timestamp}.png`);
      })
      .catch((error) => {
        console.error('Failed to download image', error);
      });
  };

  return (
    <div>
      {!isFullScreen && (
        <div>
          <input type="file" onChange={handleFileUpload} />
          {showForm ? (
            <div>
              <div>
                <h2>Select X-Axis Field</h2>
                <select onChange={(e) => setXAxisField(e.target.value)} value={xAxisField}>
                  <option value="" disabled>Select X-Axis Field</option>
                  {fields.map((field) => (
                    <option key={field} value={field}>{field}</option>
                  ))}
                </select>
                <select onChange={(e) => setXAxisScalingFactor(Number(e.target.value))} value={xAxisScalingFactor}>
                  {scalingOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                <label>{xAxisField}{formatScalingFactor(xAxisScalingFactor)}</label>
              </div>
              <div>
                <h2>Select Fields</h2>
                {fields.filter(field => field !== xAxisField).map((field) => (
                  <div key={field}>
                    <input 
                      type="checkbox" 
                      checked={selectedFields.includes(field)}
                      onChange={() => handleFieldChange(field)} 
                    />
                    <label>{field}{formatScalingFactor(scalingFactors[field] || 1)}</label>
                    <select onChange={(e) => handleScalingChange(field, Number(e.target.value))} value={scalingFactors[field] || 1}>
                      {scalingOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <button onClick={generateGraph}>Generate Graph</button>
              </div>
            </div>
          ) : (
            <div>
              <button onClick={() => setShowForm(true)}>Select Fields Again</button>
              <button onClick={() => setIsFullScreen(true)}>Full Screen</button>
              <div id="plot">
                <Plot
                  data={data}
                  layout={{ title: fileName }}
                />
              </div>
              <button onClick={downloadImage}>Download PNG</button>
            </div>
          )}
        </div>
      )}
      {isFullScreen && (
        <div id="fullScreenPlot" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'white', zIndex: 9999 }}>
          <Plot
            data={data}
            layout={{ title: fileName, autosize: true }}
            style={{ width: '100%', height: '100%' }}
          />
          <button onClick={() => setIsFullScreen(false)} style={{ position: 'fixed', top: 20, left: 20 }}>Exit Full Screen</button>
        </div>
      )}
    </div>
  );
};

export default App;
