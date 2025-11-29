# Matrix Chat

> Side project created for learning purposes: pydantic-ai minimal training. Cool interface 100% AI-Generated

## Table of Contents

1. [Introduction](#introduction)
1. [Usage](#usage)
1. [Environment Variables](#environment-variables)
1. [Running the Project](#running-the-project)
1. [Features](#features)

## Introduction

Here we have a generic generative AI chat interface inspired by The Matrix film. It uses Pydantic AI to connect to an LLM (Azure OpenAI for now).

## Usage

### Install Dependencies

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Environment Variables

Create a `.env` and fill it with your credentials, take `.env.example` as a reference

### Running the Project

Start the server:

```bash
source venv/bin/activate
python server.py
```

Open `index.html` directly or serve it with a simple HTTP server:

```bash
python -m http.server 3000
```

## TODOs

- [ ] Replace websocket
- [ ] Multi-model support
- [ ] Multi-platform support
- [ ] WebSocket streaming for real-time token generation
- [ ] Persistent storage (database instead of in-memory sessions)
- [ ] Structured outputs with mood/emotion fields
- [ ] Rate limiting
- [ ] RAG ?
- [ ] Mobile responsive design
- [ ] Docker
- [ ] Auth system
