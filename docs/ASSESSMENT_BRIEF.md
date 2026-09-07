# Take-Home Build: "Company Snapshot"

*Hand this whole document to your AI CLI as the starting point. Then read the "How we'd suggest working" section below, that part is really the point of the exercise.*

## The one-liner
Build and deploy a small web app where someone types in a company (name or website) and gets back a clean one-page snapshot of that company, built from **real information on the public web**.

## What it should do
When a user enters a company (e.g. `Stripe` or `notion.so`) and hits go, the app shows:

1. **What they do**: a clear 2 to 3 sentence description of the company.
2. **3 recent signals**: three current, real things about the company, such as recent news, a product launch, hiring activity, funding, leadership, or sentiment, whatever you can genuinely surface. Include a source or link for each where possible.
3. A **clean, readable one-page layout** with a loading state while it works.

That's the whole product. Keep the scope exactly here: no auth, accounts, dashboards, or database unless you actually find you need them.

## Constraints (these matter)
- **Real data from the live web only.** No mock data, no hardcoded company facts, no "sample" responses. When we type a company at our review call, it needs to actually go get real information.
- **No paid APIs or paid keys.** Free tiers, free or no-key APIs, your model's own web tooling, MCP tools, a small scraper, all fair game. Just nothing that costs money.
- **Deploy it.** Put it somewhere free (Vercel, Netlify, Cloudflare Pages, etc.) and send us the live link. "It runs on my machine" doesn't count.
- **Stack is your call.** React, plain HTML/JS, whatever you and the agent decide. We don't care what's under the hood as long as it works.

## Heads up, you'll probably hit a wall
Somewhere in this, the AI will likely tell you it "can't access the internet," or the data will be hard to get (a lot of sites block automated access). That moment is a normal part of this work. The interesting part is **what you do next**, how you get the agent to find a way through. There are several good paths; finding one is part of the exercise.

## How we'd suggest working (this is the actual skill we're looking at)
1. **Don't one-shot it.** Give this document to your CLI and first ask it to **write a plan**: an architecture doc and a short spec of what needs to get built. Read the plan. Push back on it where it's wrong.
2. **Then build from the plan with sub-agents.** Tell the orchestrator to spawn sub-agents to implement the pieces.
3. **Verify.** Actually run it and test it on a couple of real companies before you call it done. Don't trust "it works now!", check it yourself.
4. **(Bonus) Make it look good.** Getting an AI to produce genuinely good-looking design is its own skill. If you want, push it on the visual design and add your own taste. Not required, a clean, plain, working app is completely fine.

## What to send back
1. The **live URL**.
2. The **plan / spec doc(s)** the AI wrote.
3. Your **chat log** (export it) **or a screen recording** of you building it. We want to see *how* you worked, not just the result.
4. A **half-page note** answering:
   - Where did the AI get stuck or say it couldn't do something, and how did you get past it?
   - Where did it produce something wrong, and how did you catch it?

## Time
Aim for **2 to 3 hours**. No hard deadline, and we're not stopwatch-grading, but don't sink your whole week into it. If something's still rough at the 3-hour mark, just tell us about it in your note.
