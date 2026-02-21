# Smart EMR & Diagnostic Assistant

An AI-powered Electronic Medical Records (EMR) system designed for modern healthcare professionals. This platform combines real-time clinical documentation, intelligent diagnostics, and safety verification to help doctors spend less time on paperwork and more time caring for patients.

## Features

### Core EMR Capabilities

- **Real-Time SOAP Note Generation**: AI automatically extracts Chief Complaint, History, Vitals, Assessment, and Plan as doctors speak or type during consultations
- **Clinical Red-Flag Alert Engine**: Scans transcripts for danger keywords and triggers immediate alerts for critical conditions
- **Explainable ICD-10 Code Mapping**: Automatically matches diagnoses to ICD-10 codes with confidence scores and evidence highlighting
- **Patient Plain-Language Summary**: Generates simplified summaries in English/Hindi, ready to share via WhatsApp with QR codes

### Advanced Safety & Intelligence

- **AI Hallucination Guard**: Cross-checks generated notes against original transcripts to verify accuracy and flag uncertain extractions
- **Smart Triage Assistant**: Pre-consultation chatbot that assigns urgency levels (Emergency/Urgent/Routine) and suggests initial tests
- **Multi-Modal Input**: Upload lab reports and PDFs with OCR support to extract values and highlight abnormal results
- **Consent & Audit Trail Logger**: Complete compliance tracking with timestamps for all actions

### India-Specific Features

- **Hinglish / Multilingual Medical Voice**: Native code-switching support for Hindi-English mixed input
- **ABDM / ABHA Integration**: Links patient ABHA IDs to pull existing health records from the national health stack

## Tech Stack

### Frontend
- **Framework**: Next.js 16.1.2 with React 19
- **Authentication**: Clerk
- **Database**: Convex (real-time backend)
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI, Framer Motion
- **Icons**: Lucide React

### Backend
- **Python**: AI/ML processing
- **CrewAI**: Multi-agent orchestration
- **LangGraph**: Workflow management
- **LiteLLM**: Model routing and API abstraction
- **Groq API**: LLM inference
- **Whisper API**: Speech-to-text transcription

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── save-audio/          # Audio recording endpoints
│   │   ├── save-soap/           # SOAP note endpoints
│   │   └── save-transcript/     # Transcription endpoints
│   ├── components/              # Landing page components
│   ├── consultation/            # Video consultation pages
│   ├── dashboard/               # Doctor/patient dashboards
│   ├── documents/               # Document management
│   ├── review/                  # Note review interface
│   └── triage/                  # Triage assistant
├── backend/                     # Python backend services
│   ├── flag/                    # Red-flag detection engine
│   ├── icd/                     # ICD-10 mapping agent
│   └── soap/                    # SOAP note generation
├── components/                  # Shared React components
│   ├── dashboard/              # Dashboard components
│   └── ui/                     # UI primitives
├── convex/                     # Convex backend
│   ├── appointments.ts         # Appointment management
│   ├── consultations.ts        # Consultation logic
│   ├── schema.ts              # Database schema
│   └── users.ts               # User management
└── hooks/                      # Custom React hooks
    ├── useAudioRecorder.ts    # Audio recording
    ├── useTranscription.ts    # Speech-to-text
    └── useVideoCall.ts        # WebRTC video calls
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+
- npm or yarn
- Groq API key
- Clerk account
- Convex account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd <project-directory>
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install backend dependencies:
```bash
cd backend/icd
pip install -r requirements.txt
```

4. Set up environment variables:

Create `.env.local` in the root directory:
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Convex
NEXT_PUBLIC_CONVEX_URL=your_convex_url
CONVEX_DEPLOYMENT=your_deployment

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=your_blob_token
```

Create `backend/icd/.env`:
```env
GROQ_API_KEY=your_groq_api_key
LLM_MODEL=groq/llama-3.3-70b-versatile
USE_LITELLM_PROXY=false
```

5. Run the development servers:

Frontend:
```bash
npm run dev
```

Backend (ICD mapping service):
```bash
cd backend/icd
python main.py
```

The application will be available at `http://localhost:3000`

## Database Schema

The application uses Convex with the following main tables:

- **users**: User profiles with roles (doctor/patient)
- **appointments**: Scheduled consultations
- **transcripts**: Consultation transcripts
- **soap_notes**: Generated SOAP notes with red-flag alerts
- **signaling**: WebRTC signaling for video calls

## Key Workflows

### 1. Patient Triage
- Patient fills out pre-consultation form
- AI assigns urgency level
- Suggests initial tests
- Queues patient for doctor

### 2. Video Consultation
- WebRTC-based video call
- Real-time audio recording
- Live transcription with Whisper API
- Automatic SOAP note generation

### 3. Clinical Documentation
- AI extracts structured data from conversation
- Generates SOAP notes
- Maps diagnoses to ICD-10 codes
- Flags potential red flags
- Verifies accuracy with hallucination guard

### 4. Patient Communication
- Generates plain-language summary
- Creates shareable QR code
- Supports English and Hindi

## ICD-10 Mapping Agent

The ICD mapping service uses a multi-agent architecture:

- **Disease Extraction Agent**: Identifies medical conditions from SOAP notes
- **ICD Mapping Agent**: Matches diseases to ICD-10 codes
- **Verification Agent**: Validates mappings and confidence scores

See `backend/icd/README.md` for detailed documentation.

## Scripts

- `npm run dev`: Start development server (Next.js + Convex)
- `npm run build`: Build for production
- `npm start`: Start production server

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

See LICENSE file for details.

## Support

For issues and questions:
- Open an issue on GitHub
- Contact the development team

## Acknowledgments

- Built with Next.js, React, and Convex
- AI powered by Groq and OpenAI
- UI components from Radix UI and Shadcn
- Icons from Lucide React

---

**Note**: This is a healthcare application. Ensure compliance with local regulations (HIPAA, DPDP, ABDM) before deploying to production.
