import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Toolbar,
  Typography,
  AppBar,
  CircularProgress,
} from "@mui/material";
import {
  AutoAwesome,
  CloudUpload,
  ContentCopy,
  Description,
  Delete,
  FileUpload,
  PictureAsPdf,
  Translate,
} from "@mui/icons-material";
import jsPDF from "jspdf";
import { saveAs } from "file-saver";
import axios from "axios";
import ReactMarkdown from "react-markdown";

export default function App() {
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState("");
  const [notes, setNotes] = useState("");
  const [resultLang, setResultLang] = useState("English");
  const [action, setAction] = useState("Summarize");
  const [summaryStyle, setSummaryStyle] = useState("AI Summary");
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [meaningLang, setMeaningLang] = useState("English");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_BASE = "http://localhost:5053/api/research";

  const languages = [
    "English", "Hindi", "Spanish", "French", "German", "Chinese", "Japanese", "Russian", "Arabic"
  ];

  const actions = [
    "Summarize","Detailed_Summary","Abstract","Bullet_Summary","Paraphrase",
    "KeyPoints","Sentiment","Compare","Originality","Meaning","Translate","Keywords","Topics"
  ];

  const bgRef = useRef(null);
  const threeState = useRef({});

  // 3D Particle Background
  useEffect(() => {
    const container = bgRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = 0;
    renderer.domElement.style.left = 0;
    renderer.domElement.style.zIndex = 0;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.z = 400;

    const particleCount = 700;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 1000;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0x1fb6ff, size: 3, transparent: true, opacity: 0.7 });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const mouse = { x: 0, y: 0 };
    window.addEventListener("mousemove", (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    const animate = () => {
      points.rotation.y += 0.0006;
      points.rotation.x = mouse.y * 0.2;
      points.rotation.y += mouse.x * 0.1;
      renderer.render(scene, camera);
      threeState.current.anim = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(threeState.current.anim);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  // Map language for API
  const mapLanguage = (lang) => {
    const map = { English:"en", Hindi:"hi", Spanish:"es", French:"fr", German:"de", Chinese:"zh", Japanese:"ja", Russian:"ru", Arabic:"ar" };
    return map[lang] || "en";
  };

  // Clear specific field
  const handleClear = (field) => {
    switch(field){
      case "input": setInputText(""); break;
      case "result": setResult(""); break;
      case "meaning": setWord(""); setMeaning(""); break;
      case "notes": setNotes(""); break;
      case "file": setFile(null); break;
      default: break;
    }
  };

  // Copy to notes
  const handleCopy = (text) => {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setNotes(prev => (prev ? prev + "\n" + text : text));
  };

  // Generate content from API
  const handleGenerate = async (type) => {
    setLoading(true);
    setResult(""); // Clear previous result every time
    try {
      if (type === "input") {
        if (!inputText.trim()) { alert("Please enter text"); return; }
        const res = await axios.post(`${API_BASE}/process`, {
          operation: action.toLowerCase(),
          content: inputText,
          targetLanguage: mapLanguage(resultLang),
          summaryStyle: summaryStyle.toLowerCase().replace(" ", "_"),
        });
        const processed = res.data;
        setResult(processed.result || processed.extractedText || JSON.stringify(processed, null, 2));
      } else if (type === "meaning") {
        if (!word.trim()) { alert("Please enter a word"); return; }
        const res = await axios.post(`${API_BASE}/process`, {
          operation: "meaning",
          content: word,
          targetLanguage: mapLanguage(meaningLang),
        });
        setMeaning(res.data.result || res.data.extractedText || res.data);
      } else if (type === "upload") {
        if (!file) { alert("No file selected"); return; }
        const formData = new FormData();
        formData.append("file", file);
        const res = await axios.post(`${API_BASE}/upload`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const uploadedResult = res.data;
        setResult(uploadedResult.result || uploadedResult.extractedText || JSON.stringify(uploadedResult, null, 2));
      }
    } catch (err) {
      console.error(err);
      alert("Error processing request");
    } finally { setLoading(false); }
  };

  // Download notes as PDF
  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text(doc.splitTextToSize(notes || "No notes available", 180), 10, 20);
    doc.save("Research_Notes.pdf");
  };

  // Download notes as DOCX
  const handleDownloadDOCX = () => {
    const blob = new Blob([notes || "No notes available"], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    saveAs(blob, "Research_Notes.docx");
  };

  // Common card styles
  const commonCardSx = {
    borderRadius: "16px",
    boxShadow: "0 8px 25px rgba(0,0,0,0.12)",
    transition: "all 0.3s ease",
    "&:hover": {
      transform: "translateY(-6px)",
      boxShadow: "0 12px 35px rgba(0,0,0,0.25)",
    },
    p: 2,
  };

  const buttonSx = {
    gradientPrimary: { background: "linear-gradient(135deg,#0284c7,#0ea5e9)", color: "#fff", fontWeight: 700, textTransform: "none", borderRadius: "25px", transition: "all 0.3s ease", "&:hover": { transform: "scale(1.05)", boxShadow: "0 0 20px rgba(14,165,233,0.7)" } },
    gradientSecondary: { background: "linear-gradient(135deg,#6ee7b7,#3b82f6)", color: "#023047", fontWeight: 700, textTransform: "none", borderRadius: "25px", transition: "all 0.3s ease", "&:hover": { transform: "scale(1.05)", boxShadow: "0 0 20px rgba(96,165,250,0.6)" } }
  };

  const cardGradient = {
    Input: "linear-gradient(135deg,#a1c4fd,#c2e9fb)",
    Result: "linear-gradient(135deg,#fbc2eb,#a6c1ee)",
    Meaning: "linear-gradient(135deg,#fdcbf1,#e6dee9)",
    Upload: "linear-gradient(135deg,#d4fc79,#96e6a1)",
    Notes: "linear-gradient(135deg,#fddb92,#d1fdff)"
  };

  const resultBoxSx = {
    mt: 2, minHeight: "200px", p: 2, borderRadius: "12px", border: "1px solid rgba(0,0,0,0.1)",
    backgroundColor: "#f8f9fa", fontFamily: "Roboto, sans-serif", fontSize: "0.95rem", color: "#1e293b",
    overflowY: "auto", whiteSpace: "pre-wrap", boxShadow: "inset 0 0 10px rgba(0,0,0,0.05)", transition: "all 0.3s ease",
    "&:hover": { boxShadow: "inset 0 0 15px rgba(0,0,0,0.08), 0 0 15px rgba(14,165,233,0.2)" },
  };

  return (
    <Box sx={{ position: "relative", minHeight: "100vh", backgroundColor: "#ffffff" }}>
      <Box ref={bgRef} sx={{ position: "fixed", inset: 0, zIndex: 0 }} />
      <Box sx={{ position: "relative", zIndex: 1 }}>
        <AppBar position="static" sx={{ background: "#fff", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", mb: 2 }}>
          <Toolbar sx={{ justifyContent: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "#0b2540" }}>Research Assistant Pro</Typography>
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ py: 5 }}>
          <Grid container spacing={3}>

            {/* Input Section */}
            <Grid item xs={12} md={6}>
              <Card sx={{ ...commonCardSx, background: cardGradient.Input }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Input</Typography>
                  <TextField fullWidth multiline rows={6} placeholder="Paste your research text..." value={inputText} onChange={(e) => setInputText(e.target.value)} sx={{ mt: 2 }} />
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Action</InputLabel>
                        <Select value={action} onChange={(e) => setAction(e.target.value)}>
                          {actions.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6}>
                      <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select value={resultLang} onChange={(e) => setResultLang(e.target.value)}>
                          {languages.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={8}>
                      <FormControl fullWidth>
                        <InputLabel>Summary Style</InputLabel>
                        <Select value={summaryStyle} onChange={(e) => setSummaryStyle(e.target.value)}>
                          <MenuItem value="AI Summary">AI Summary</MenuItem>
                          <MenuItem value="Human Summary">Human Summary</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={4} sx={{ display: "flex", gap: 1 }}>
                      <Button sx={buttonSx.gradientPrimary} onClick={() => handleGenerate("input")}><AutoAwesome sx={{ mr: 1 }} /> Generate</Button>
                      <Button onClick={() => handleClear("input")}><Delete sx={{ color: "#d32f2f" }} /></Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Result Section */}
            <Grid item xs={12} md={6}>
              <Card sx={{ ...commonCardSx, background: cardGradient.Result }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>Result</Typography>
                  <Box sx={resultBoxSx}>
                    {loading ? (
                      <Box sx={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%" }}>
                        <CircularProgress size={30} color="info"/>
                        <Typography sx={{ ml:2, color:"#0284c7", fontWeight:600 }}>Processing...</Typography>
                      </Box>
                    ) : result ? (
                      <Box sx={{ whiteSpace: "pre-wrap", fontFamily: "Roboto, sans-serif", color: "#1e293b" }}>
                        {result}
                      </Box>
                    ) : (
                      <Typography sx={{ color: "gray" }}>Generated result will appear here...</Typography>
                    )}
                  </Box>
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={8}>
                      <Button sx={buttonSx.gradientSecondary} onClick={() => handleCopy(result)}><ContentCopy sx={{ mr: 1 }}/> Copy to Notes</Button>
                    </Grid>
                    <Grid item xs={4}><Button onClick={() => handleClear("result")}><Delete sx={{ color:"#d32f2f" }} /> Clear</Button></Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Meaning Section */}
            <Grid item xs={12} md={6}>
              <Card sx={{ ...commonCardSx, background: cardGradient.Meaning }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Word Meaning</Typography>
                  <TextField fullWidth label="Word or phrase" value={word} onChange={(e)=>setWord(e.target.value)} sx={{ mt:2 }}/>
                  <FormControl fullWidth sx={{ mt:2 }}>
                    <InputLabel>Language</InputLabel>
                    <Select value={meaningLang} onChange={(e)=>setMeaningLang(e.target.value)}>
                      {languages.map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <Grid container spacing={2} sx={{ mt:2 }}>
                    <Grid item xs={4}><Button sx={buttonSx.gradientPrimary} onClick={()=>handleGenerate("meaning")}><Translate sx={{mr:1}}/> Find</Button></Grid>
                    <Grid item xs={4}><Button sx={buttonSx.gradientSecondary} onClick={()=>handleCopy(meaning)}><ContentCopy sx={{mr:1}}/> Copy</Button></Grid>
                    <Grid item xs={4}><Button onClick={()=>handleClear("meaning")}><Delete sx={{color:"#d32f2f"}}/> Clear</Button></Grid>
                  </Grid>
                  <TextField fullWidth multiline rows={3} value={meaning} InputProps={{ readOnly:true }} placeholder="Meaning will appear..." sx={{ mt:2 }}/>
                </CardContent>
              </Card>
            </Grid>

            {/* Upload Section */}
            <Grid item xs={12} md={6}>
              <Card sx={{ ...commonCardSx, background: cardGradient.Upload }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Upload & Process</Typography>
                  <Button component="label" variant="outlined" fullWidth startIcon={<CloudUpload />} sx={{ mt:2, textTransform:"none" }}>
                    Upload File
                    <input type="file" hidden onChange={(e)=>setFile(e.target.files?.[0]||null)} />
                  </Button>
                  {file && <Typography sx={{ mt:1 }}>Selected: <strong>{file.name}</strong></Typography>}
                  <Grid container spacing={2} sx={{ mt:2 }}>
                    <Grid item xs={8}><Button sx={buttonSx.gradientPrimary} onClick={()=>handleGenerate("upload")}><FileUpload sx={{mr:1}}/> Process</Button></Grid>
                    <Grid item xs={4}><Button onClick={()=>handleClear("file")}><Delete sx={{color:"#d32f2f"}}/> Clear</Button></Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

            {/* Notes Section */}
            <Grid item xs={12}>
              <Card sx={{ ...commonCardSx, background: cardGradient.Notes }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight:700 }}>Notes</Typography>
                  <TextField fullWidth multiline rows={6} value={notes} placeholder="All copied notes will appear here..." onChange={(e)=>setNotes(e.target.value)} sx={{ mt:2 }}/>
                  <Grid container spacing={2} sx={{ mt:2 }}>
                    <Grid item xs={6} sx={{ display:"flex", gap:2 }}>
                      <Button sx={buttonSx.gradientPrimary} onClick={handleDownloadPDF}><Description sx={{mr:1}}/> Download PDF</Button>
                      <Button sx={buttonSx.gradientSecondary} onClick={handleDownloadDOCX}><Description sx={{mr:1}}/> Download DOCX</Button>
                    </Grid>
                    <Grid item xs={6} sx={{ textAlign:"right" }}><Button onClick={()=>handleClear("notes")}><Delete sx={{color:"#d32f2f"}}/> Clear All</Button></Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Grid>

          </Grid>
        </Container>
      </Box>
    </Box>
  );
}
