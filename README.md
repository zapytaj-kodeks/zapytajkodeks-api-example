# ZapytajKodeks API Example

A simple Node.js client for streaming responses from the [ZapytajKodeks](https://zapytajkodeks.pl) API.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file with your API key:

```bash
ZAPYTAJKODEKS_API_KEY=your_api_key_here
```

## Usage

```bash
node stream.js "Your legal question here"
```

### Example

```bash
node stream.js "Jeżeli mam kilku pełnomocników w urzędzie, to komu właściwie urząd wysyła pisma?"
```

The script will stream the response in real-time and display sources at the end.

## Load Testing

Test the non-streaming API with multiple requests:

```bash
node test.js [count] [concurrency]
```

- `count` - number of requests (default: 100)
- `concurrency` - parallel requests (default: 5)

### Example

```bash
node test.js 100 10
```

This will send 100 requests, 10 at a time, and report success/failure stats.
