import { type NextRequest, NextResponse } from "next/server"

const worksheets: Record<string, { filename: string; body: string }> = {
  "pre-call-worksheet": {
    filename: "the-healthy-way-pre-call-worksheet.md",
    body: `# The Healthy Way Pre-Call Worksheet

## Wins
- What felt easier this week?
- Which healthy choice are you proud of repeating?

## Obstacles
- Where did food, movement, sleep, or stress feel hardest?
- What got in the way?

## Support
- What do you want coaching on during the call?
- What is one specific action you can take in the next 24 hours?
`,
  },
}

export function GET(request: NextRequest) {
  const resource = request.nextUrl.searchParams.get("resource") ?? ""
  const worksheet = worksheets[resource]

  if (!worksheet) {
    return NextResponse.json({ error: "Resource not found" }, { status: 404 })
  }

  return new NextResponse(worksheet.body, {
    headers: {
      "Content-Disposition": `attachment; filename="${worksheet.filename}"`,
      "Content-Type": "text/markdown; charset=utf-8",
    },
  })
}
