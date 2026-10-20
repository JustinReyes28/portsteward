# A 30-second sample demo
Use the actual application on Windows. Record at about 100 columns × 30 rows with sample projects only. This is a recording plan; no live video is included.

## Prepare once
From the repository root:
~~~powershell
node portpilot-app/src/cli.mjs examples .portsteward/press-demo
node portpilot-app/src/cli.mjs profiles import .portsteward/press-demo/profiles.json --config .portsteward/press-demo/registry.json
node portpilot-app/src/cli.mjs interactive --config .portsteward/press-demo/registry.json
~~~
The examples command writes new files and refuses overwrite. Reuse an existing prepared fixture rather than rerunning it in the same directory.
Choose two unused ports if 3000 or 4000 is already occupied, and edit both expectedPorts and the corresponding saved argument before launch. Use the actual server process, not an npm wrapper. Don't stop unrelated processes to make the recording work.

## Shots and voiceover
0–5 seconds: Projects view, showing Sample Web and Sample API with shared port expectations.
Caption: "Two local projects. One familiar port."
Voiceover: "PortSteward keeps saved project expectations separate from what's actually listening."

5–11 seconds: Launch Sample Web from Projects. Show the full launch preview and type LAUNCH. Do the same for Sample API; shorten waiting time in the edit without implying instant readiness.
Caption: "Launch from an explicit saved profile."
Voiceover: "Launch each server from its saved command."

11–18 seconds: Ports and Details views. Show observed PIDs, the managed evidence label and the shared expectation on 3000.
Caption: "Inspect the process and its ownership evidence."
Voiceover: "See the actual listener alongside configured project ports."

18–26 seconds: Preview restart of Sample Web, show the original command, type RESTART, then show the new web PID and unchanged API PID.
Caption: "Restart this managed server."
Voiceover: "Preview and confirm a restart of the server the tool launched."

26–30 seconds: End card with the wide PNG or a clean terminal frame.
Caption: "Windows alpha · MIT · Run from source"
Voiceover: "The source and examples are on GitHub. Feedback on setup and ownership labels is welcome."
Link: https://github.com/JustinReyes28/portsteward

## Capture and editing notes
Record the actual returned result. Leave the preview readable and keep the confirmation on screen.
Show the API still responding in a browser tab or keep its unchanged PID visible in the final frame. Do not add a "still running" caption without observing it.
Add captions for sound-off viewing. The share cards and simulated walkthrough are labelled illustrations/simulations; never substitute them for a live result.
Use built-in screen recording if already available. No recording tool download is needed for the preparation in this kit.
After recording, stop only the sample managed servers through their previews. Closing the dashboard leaves them running.

## Screenshot captions
- "Configured ports and observed listeners are shown separately."
- "The full process preview comes before confirmation."
- "A managed restart uses the original run's saved command."
