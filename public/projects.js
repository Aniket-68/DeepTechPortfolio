// To add a screenshot, save it in the screenshots folder and set img:"screenshots/name.jpg".
// EDIT THIS FILE to update your portfolio. Set sample:false once a project is real.
window.SITE = {
  brand: "DeepTech",
  tagline: "IT software development and maintenance. We build AI applications, Android apps and web apps.",
  email: "deeptechtech@gmail.com",
  phone: "+91 81698 82434", wa: "918169882434",
  links: { github: "https://github.com/Aniket-68", linkedin: "https://www.linkedin.com/in/aniket-chauhan-110b8727", portfolio: "https://portfolio.aniketchauhan.site" }
};
window.PROJECTS = [
  { name:"Upscale", cat:"Web Apps", year:"", sample:false, desc:"Global hiring platform: find vetted remote talent, with contracts, payroll and compliance handled in 180+ countries.", tags:["Hiring","Platform","Global"], url:"https://upscale.io/", img:"screenshots/upscale.jpg" },
  { name:"AgriForetell", cat:"AI Applications", year:"", sample:false, desc:"Remote sensing and AI for agriculture: spectral analysis for early crop disease detection and satellite crop-area mapping.", tags:["Remote sensing","AI","AgriTech"], url:"https://agriforetell.com/", img:"screenshots/agriforetell.jpg" },
  { name:"AgriForetell Monitor", cat:"Web Apps", year:"", sample:false, desc:"Crop growth monitoring from satellite imagery. Draw your farm on a map and get analysed images every 5 to 7 days, with trend graphs and Excel export.", tags:["Satellite","Dashboard","GIS"], url:"https://monitor.agriforetell.com/registration.php", img:"screenshots/agriforetell-monitor.jpg" },
  { name:"UpScaleUp", cat:"Web Apps", year:"", sample:false, desc:"WhatsApp marketing and automation platform: bulk campaigns, chatbot flows and a team inbox on the WhatsApp Business API.", tags:["WhatsApp API","Chatbots","SaaS"], url:"https://upscaleup.io/", img:"screenshots/upscaleup.jpg" },
  { name:"WalkSense", cat:"AI Applications", year:"2026", sample:false, desc:"Multimodal AI navigation assistant for visually impaired users (M.Tech research).", tags:["Vision","LLM","Edge"], url:"https://walksense.aniketaidev.online", img:"screenshots/walksense.svg" },
  { name:"AI Voice Agent", cat:"AI Applications", year:"2026", sample:false, desc:"Voice-first AI agent SaaS concept for Indian SMBs: calls, bookings, follow-ups.", tags:["Voice","LLM","SaaS"] },
  { name:"Clinical Notes RAG", cat:"AI Applications", year:"2025", sample:false, desc:"Retrieval-augmented assistant that summarises patient records with citations.", tags:["RAG","Healthcare","Python"] },
  { name:"EV Charge Orchestrator", cat:"Web Apps", year:"2024", sample:false, desc:"Scalable backend managing charger sessions, billing and telemetry.", tags:["Go","MQTT","Postgres"] },
  { name:"Charger Uptime Monitor", cat:"Maintenance & Support", year:"2024", sample:false, desc:"Real-time health dashboard and alerting for EV charging networks.", tags:["Kafka","Grafana"] },
  { name:"LongHealth RAG Application", cat:"AI Applications", year:"", sample:false, private:true, desc:"Retrieval-augmented generation (RAG) application that answers questions over medical records and documents, with cited sources. Built for LongHealth (longhealth.io).", tags:["RAG","LLM","Healthcare","B2B"], img:"screenshots/longhealth-rag.svg" },
  { name:"AI Scribe", cat:"AI Applications", year:"", sample:false, private:true, desc:"Converts clinician-patient conversations into text and then structured SOAP notes, to cut documentation time. Built for LongHealth (longhealth.io).", tags:["Speech-to-text","LLM","SOAP notes","Healthcare"], img:"screenshots/longhealth-scribe.svg" },
  { name:"Medical Record Summarization", cat:"AI Applications", year:"", sample:false, private:true, desc:"Summarizes long patient histories, diagnoses, medications and lab results for quick clinical review. Built for LongHealth (longhealth.io).", tags:["LLM","Summarization","Healthcare","B2B"], img:"screenshots/longhealth-summary.svg" },
  { name:"Field Mapping Application", cat:"Android Apps", year:"", sample:false, private:true, desc:"Android app for mapping and recording field data on site. Built for a B2B client and delivered with source code.", tags:["Android","Mapping","B2B"], img:"screenshots/field-mapping.svg" },
  { name:"Crop Disease Detector", cat:"AI Applications", year:"", sample:false, private:true, desc:"AI model that detects crop diseases from leaf images. Built for a B2B client and delivered with source code.", tags:["AI","Computer vision","AgriTech","B2B"], img:"screenshots/crop-disease.svg" },
  { name:"Loan Eligibility Engine", cat:"Web Apps", year:"2025", sample:false, desc:"Explainable credit-eligibility scoring with an audit trail.", tags:["XGBoost","SHAP"] },
  { name:"Resume Evaluator", cat:"AI Applications", year:"2026", sample:false, desc:"Scores resumes against job descriptions with structured feedback.", tags:["LLM","Evals"] },
  { name:"HML Loading and Unloading Inventory Tracking Platform", cat:"Android Apps", year:"", sample:false, private:true, desc:"Android app and web app that track inventory as goods are loaded and unloaded. Built for a B2B client and delivered with source code.", tags:["Android","Web app","Inventory","B2B"], img:"screenshots/hml-inventory.svg" },
  { name:"AI Employee", cat:"AI Applications", year:"2026", sample:false, desc:"Tool-using agent automating recurring back-office tasks.", tags:["Agents","Tools"] },
  { name:"Document Q&A Platform", cat:"Web Apps", year:"2025", sample:false, desc:"Multi-tenant document chat with hybrid search and reranking.", tags:["RAG","pgvector"] },
  { name:"Facial Recognition Attendance System", cat:"Android Apps", year:"", sample:false, private:true, desc:"Face-recognition attendance for daily wage workers, running on Android. Built for a B2B client and delivered with source code.", tags:["Android","Face recognition","Attendance","B2B"], img:"screenshots/face-attendance.svg" },
  { name:"API Gateway Suite", cat:"Maintenance & Support", year:"2023", sample:false, desc:"Rate-limited, observable API layer serving millions of requests.", tags:["Node","Redis"] },
  { name:"Realtime Vision Pipeline", cat:"AI Applications", year:"2025", sample:false, desc:"Low-latency object detection streaming from edge cameras.", tags:["YOLO","gRPC"] },
  { name:"LLM Eval Harness", cat:"Maintenance & Support", year:"2026", sample:false, desc:"Automated regression and quality evals for prompts and agents.", tags:["Evals","CI"] }
];

// Client testimonials. Add only real quotes that the client has agreed to share.
// The section stays hidden until at least one is added. Example:
// { quote:"DeepTech delivered on time and the app works well.", name:"Full Name", role:"Title, Company" }
window.TESTIMONIALS = [
];
