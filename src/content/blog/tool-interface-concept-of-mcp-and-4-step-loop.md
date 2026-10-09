---
title: "Tool Interface 'concept of MCP and 4 step loop\""
date: "2026-10-04"
tags: []
draft: false
---

*Welcome to the new Ai era where we all have full avaiability to convert our ideas to working solutions with no restrictions for background knowledge or other metrics. All this happens with concept of multimodal languages. Systems which are capable of understanding and learning from multiple type of inputs (like text, audio, links, images) instead of traditional models which only focuses on text. But still few things which we knows these system are incapable of :* 
  - _They are working on probablistic based algorithms for prediction of next word which somehow limiting their knowledge_. 

*I will give you a example here what i want to say : ask any model something that model have not trained for, it starts predicting and telling you something extremly odd which is not even truth of fact and this is called Hallucination.*

*To avoid all these concepts we think of giving our mulitmodal systems capablity to fetch real time information if they dont have knowledge of the context asked by user, so there must be truth of facts. for this idealogy we have introduced "The Tool Interface" and we all have used it.*

**What is this Tool Interface ?**

> If we talk technically we have two elements everywhere which works independently one is multimodel ai and other is the program. Models produces tokens and programs take action.
There is no connectivity in between them and this process is entirly governed by human.

<img width="996" height="325" alt="image" src="https://github.com/user-attachments/assets/3b858dbd-01e3-4996-bf2b-2affcf318e0c" />


*To make these systems effecient we fill this gap between two tools connectivity and called it "Tool Interface". This act as a contract which lets model request an action and the host will execute it.*

**What is solves ?**
*Till now our model do not have accessiblity to live feeds and will entirely depend upon the the context it was trained on. The host program — your agent runtime, Claude Desktop, ChatGPT, Cursor, or a custom script — advertises a list of callable tools to the model. The model, when it decides an action is needed, emits a structured payload naming a tool and its arguments. The host parses that payload, runs the tool for real, and feeds the result back. The loop continues until the model decides no more calls are needed. This concept give your model ability to fetch real time data and never ever hullicinates.*

```
lets understand this in simple language.

Suppose you ask an AI: "Check whether my website is working and tell me if there are any errors."

The AI can understand your request, but it cannot automatically access your website or run commands on your computer. It needs tools to do that.
```



<img width="850" height="1720" alt="image" src="https://github.com/user-attachments/assets/01525952-4684-4e9c-b856-52605cda2ad1" />




*Since every model started showing their own contract, so they introduced Model Context Protocol (MCP) genralized the contract so one tool registry serve every model. All these follow the same ''four-step loop'' which we learn next.*

**Four Step Loop Concept**


<img width="763" height="241" alt="image" src="https://github.com/user-attachments/assets/f3fdaa52-1943-4567-b3c1-3579a25f0247" />



## Step 1: Describe — "What tools do I have?"

*Every tool is described using three fields.*

### 1. Name — The tool's identity

> `get_weather`

*A clear, machine-readable name that the model can use to request the tool.*

### 2. Description — When to use it

> Use this tool when the user asks about current weather in a specific city.

*The description helps the model understand when the tool is appropriate.*

### 3. Input schema — What information is required

*For example, the tool might accept a city name as a string:*

```json
{
  "city": "string"
}
```

*The schema defines which arguments are allowed, which are required, and what types they must have.*

**Analogy:** *The tool is the restaurant, the description is the menu, and the schema is the order form.*

*The host makes these tool descriptions available to the model, so it can decide which tool is suitable.*

## Step 2: Decide — "Should I use a tool?"

*Suppose the user asks:*

> What's the weather in Dehradun right now?

*The model has three broad options:*

> - **Answer directly:** If the user asks "What is 2 + 2?", it can answer without a tool.
> - **Call a tool:** Current weather requires fresh information, so it may request `get_weather` with the city argument.
> - **Refuse:** If a request is unsafe or disallowed, it may refuse rather than use a tool.

### What does a tool call look like?

*Conceptually, the model may produce a structured request like this:*

```json
{
  "call_id": "call_123",
  "tool_name": "get_weather",
  "arguments": {
    "city": "Dehradun"
  }
}
```

*The three important parts are:*
```
  - `call_id`: A tracking ID that lets the host match a result to the correct request.
  - `tool_name`: The tool to call.
  - `arguments`: The data passed to the tool.
```
### Why is the call ID important?

*Imagine the model requests weather for Dehradun and Delhi at the same time. If Delhi's result arrives first, the host can still match each result to its request using the call ID.*

> This is called **parallel tool calling**. It is supported by some model APIs, depending on the provider and configuration.

## Step 3: Execute — "Actually do the work"

*The host receives the model's request and attempts to execute it. Before running the tool, it should validate the arguments against the tool's schema.*

### Check the input

```
For example:

- Is `city` provided?
- Is it a string?
- Are unexpected arguments present?
```

*Suppose the model sends:*

```json
{
  "city": 12345
}
```

*But the schema requires a string. The host can reject the request and return an error to the model, safely repair an unambiguous formatting issue, or ask the model to try again with the validation error included.*

### Run the actual code

*The executor might be Python code, a TypeScript function, a shell command, a database query, or an MCP server's tool implementation.*

### Return the result

*A weather tool might return data like this:*

```json
{
  "city": "Dehradun",
  "temperature_c": 24,
  "condition": "Cloudy"
}
```

*These are illustrative values, not live weather data.*

*The result must be representable in a format the host can pass back to the model, such as text, JSON, or supported structured content.*

> **Important:** Valid arguments do not guarantee a successful operation. An external service can still fail or return an error.

## Step 4: Observe — "What happened?"

*The host adds the tool result to the conversation and sends the updated context back to the model. The model can now use the actual output instead of guessing.*
```
For example:

**Tool result**

- Temperature: 24°C
- Condition: Cloudy

**Possible AI response**

> The tool reports that Dehradun is 24°C and cloudy.
```

*These values are only an illustration.*

*If the user also asks whether it will rain tomorrow, the first tool might not provide a forecast. The model can request another tool call, and the loop repeats until it has enough information or the host stops it because of an error, safety restriction, or iteration limit.*

## The trust split: Not all tools are equally risky

*Tools can be grouped by the risks they introduce.*

### Pure or read-only tools

```
Examples:

- Search documentation
- Read weather data
- Calculate a sum
- Read a file

These typically do not change external state, so they are often lower risk. However, reading sensitive information can still create privacy risks.
```
### Consequential tools
```
Examples:

- Send an email
- Delete a file
- Transfer money
- Execute a trade
```

*These actions can have real consequences. They may need authorization, permission checks, user confirmation, and audit logs.*

> **Key distinction:** Reading an email and sending an email are not the same. One accesses information; the other takes an action on someone's behalf.

### The "Rule of Two" concept

*The referenced security principle focuses on combinations of three risk factors:*

1. **Untrusted input:** Content that could contain malicious instructions.
2. **Sensitive data:** Private or confidential information.
3. **Consequential action:** An operation that changes something or causes real-world effects.

*For example, an agent reads an untrusted email, accesses private company records, and then sends an email externally. Combining all three risks can be dangerous.*

*Safer designs restrict permissions, isolate untrusted content, and require approval for consequential actions when appropriate. Verify the original source before treating a specific "Rule of Two" attribution as a universally adopted standard.*

## Where does the loop live?

*The four steps remain broadly similar, but different systems assign responsibilities differently.*

| System | Who describes tools or capabilities? | Who decides? | Who executes? |
|---|---|---|---|
| Function calling | Application developer | AI model | Application code or connected executor |
| MCP | MCP server advertises tools | AI model via the host/client | MCP server or delegated system |
| A2A | Agent publishes its capabilities | Calling agent | Called agent |
| Browser agent | Browser integration exposes capabilities | AI model | Browser runtime or connected service |

*In MCP, the server advertises tools and their schemas. The host's MCP client makes them available to the model and routes requested calls to the server.*

*The names and responsibilities vary, but the general cycle is similar.*

## Why not just ask the model to output JSON?

*Simply prompting the model to "always respond in JSON" is not the same as enforcing a structured format. A model might produce malformed JSON, omit a required field, or use a number where a string is expected.*

*Native tool calling helps because:*

1. **Dedicated call format:** The tool request uses a protocol-specific structure instead of ordinary chat text.
2. **Schema validation:** The host can check arguments before execution.
3. **Constrained outputs:** Some providers offer strict modes that constrain output to supported schemas.

*Strict structured-output modes can enforce schema compliance for supported schemas and configurations. They do **not** guarantee that the chosen tool is correct, that the arguments are factually appropriate, or that execution will succeed.*

## Circuit breakers — How do you stop an endless loop?
```
Imagine an agent repeatedly calling a broken tool:

1. Call the tool.
2. Receive an error.
3. Try again.
4. Receive the same error.
5. Repeat indefinitely.
```

*Each call can consume time, computing resources, or API credits.*


*Production hosts should impose limits such as:*

- Maximum tool-call iterations
- Timeouts for slow tools
- API usage and spending limits
- Retry limits for repeated failures
- Permission checks and confirmation for sensitive actions

*The exact limits depend on the application. The goal is to ensure that an agent eventually stops instead of repeating the same failed operation.*

<img width="930" height="678" alt="image" src="https://github.com/user-attachments/assets/abc2a48a-21b8-4fca-8308-dfd66edda398" />

