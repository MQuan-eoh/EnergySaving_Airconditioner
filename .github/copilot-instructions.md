. Project Overview & Goal
Project Name: Smart Air Conditioner.

Core Goal: Develop a web-based interface for a smart air conditioner that uses AI to automatically adjust the temperature, optimizing for user comfort and energy savings.
Please act as Tech lead thinking and implementation.
Please coding with english comments and variable names.
And when chatting with user, please use vietnamese.
Primary Technologies: HTML, CSS, JavaScript. We will also use modern frameworks (like React or Vue.js components, if applicable) and libraries (like Chart.js for data visualization) to enhance the user interface. The final output must be compatible and runnable directly from an HTML file.

2. Code Quality and Structure Rules 📜
   Clean Code is Mandatory: All code must be clean, readable, and well-documented. Follow the principles of DRY (Don't Repeat Yourself).

Strict Folder Structure: Adhere to a professional folder structure. Example:

/project-root
├── index.html
├── /assets
│ ├── /css
│ │ ├── style.css
│ │ └── theme.css
│ ├── /js
│ │ ├── main.js
│ │ └── api.js
│ └── /images
│ └── background.png
└── /components
└── (Reusable UI components if using a framework)
No Icons in Code: Strictly forbidden to use emojis or icons in console.log() messages, comments, variable names, or function names. Keep all logs and comments professional and descriptive.

File Length Limit: Keep each file focused on a single responsibility. Files should not be excessively long. If a JavaScript file exceeds 200-250 lines, consider refactoring it into smaller, more manageable modules. This improves readability and simplifies debugging.

3. Frontend UI/UX Design Guidelines 🎨
   Design Style: The user interface must be modern, professional, and visually appealing. The primary design theme is Glassmorphism (Glass Effect) with a default Dark Mode.

Dark Mode: The primary color palette should be dark (e.g., shades of charcoal, navy blue) with high-contrast text (e.g., white or light gray) and accent colors (e.g., electric blue, cool green) for interactive elements like buttons and charts.

Frameworks & Libraries: You are encouraged to suggest and use CSS frameworks (like Bootstrap or Tailwind CSS) or JavaScript libraries to achieve the desired design, as long as they can be easily integrated into a static HTML/CSS/JS project.

Responsiveness: The UI must be fully responsive and function flawlessly on both desktop and mobile devices.

4. Development Workflow & Copilot Behavior 🧠
   Scan Before Coding: Before generating any code, you must scan all relevant project files (.html, .css, .js) to fully understand the existing context, structure, and logic. This ensures that new code integrates seamlessly with the existing system.

Focused Modifications: When tasked with fixing a bug or implementing an upgrade, your modifications must be highly targeted.

Identify the Root Cause: First, analyze and state the root cause of the bug or the specific components that need updating.

Isolate Changes: Modify only the necessary elements. Do not refactor or alter unrelated code, as this can introduce new bugs. Your goal is precision and stability.

Clarify Before Acting: If a request is ambiguous or you lack sufficient information, do not generate speculative or incorrect code. Instead, ask for clarification or state what information is missing. Your priority is to produce correct and relevant code based on clear requirements. Do not guess.

Your task is to "onboard" this repository to Copilot coding agent by adding a .github/copilot-instructions.md file in the repository that contains information describing how a coding agent seeing it for the first time can work most efficiently.

You will do this task only one time per repository and doing a good job can SIGNIFICANTLY improve the quality of the agent's work, so take your time, think carefully, and search thoroughly before writing the instructions.

<Goals>
- Reduce the likelihood of a coding agent pull request getting rejected by the user due to
generating code that fails the continuous integration build, fails a validation pipeline, or
having misbehavior.
- Minimize bash command and build failures.
- Allow the agent to complete its task more quickly by minimizing the need for exploration using grep, find, str_replace_editor, and code search tools.
</Goals>

<Limitations>
- Instructions must be no longer than 2 pages.
- Instructions must not be task specific.
</Limitations>

<WhatToAdd>

Add the following high level details about the codebase to reduce the amount of searching the agent has to do to understand the codebase each time:
<HighLevelDetails>

- A summary of what the repository does.
- High level repository information, such as the size of the repo, the type of the project, the languages, frameworks, or target runtimes in use.
  </HighLevelDetails>

Add information about how to build and validate changes so the agent does not need to search and find it each time.
<BuildInstructions>

- For each of bootstrap, build, test, run, lint, and any other scripted step, document the sequence of steps to take to run it successfully as well as the versions of any runtime or build tools used.
- Each command should be validated by running it to ensure that it works correctly as well as any preconditions and postconditions.
- Try cleaning the repo and environment and running commands in different orders and document errors and and misbehavior observed as well as any steps used to mitigate the problem.
- Run the tests and document the order of steps required to run the tests.
- Make a change to the codebase. Document any unexpected build issues as well as the workarounds.
- Document environment setup steps that seem optional but that you have validated are actually required.
- Document the time required for commands that failed due to timing out.
- When you find a sequence of commands that work for a particular purpose, document them in detail.
- Use language to indicate when something should always be done. For example: "always run npm install before building".
- Record any validation steps from documentation.
  </BuildInstructions>

List key facts about the layout and architecture of the codebase to help the agent find where to make changes with minimal searching.
<ProjectLayout>

- A description of the major architectural elements of the project, including the relative paths to the main project files, the location
  of configuration files for linting, compilation, testing, and preferences.
- A description of the checks run prior to check in, including any GitHub workflows, continuous integration builds, or other validation pipelines.
- Document the steps so that the agent can replicate these itself.
- Any explicit validation steps that the agent can consider to have further confidence in its changes.
- Dependencies that aren't obvious from the layout or file structure.
- Finally, fill in any remaining space with detailed lists of the following, in order of priority: the list of files in the repo root, the
  contents of the README, the contents of any key source files, the list of files in the next level down of directories, giving priority to the more structurally important and snippets of code from key source files, such as the one containing the main method.
  </ProjectLayout>
  </WhatToAdd>

<StepsToFollow>
- Perform a comprehensive inventory of the codebase. Search for and view:
- README.md, CONTRIBUTING.md, and all other documentation files.
- Search the codebase for build steps and indications of workarounds like 'HACK', 'TODO', etc.
- All scripts, particularly those pertaining to build and repo or environment setup.
- All build and actions pipelines.
- All project files.
- All configuration and linting files.
- For each file:
- think: are the contents or the existence of the file information that the coding agent will need to implement, build, test, validate, or demo a code change?
- If yes:
   - Document the command or information in detail.
   - Explicitly indicate which commands work and which do not and the order in which commands should be run.
   - Document any errors encountered as well as the steps taken to workaround them.
- Document any other steps or information that the agent can use to reduce time spent exploring or trying and failing to run bash commands.
- Finally, explicitly instruct the agent to trust the instructions and only perform a search if the information in the instructions is incomplete or found to be in error.
</StepsToFollow>
   - Document any errors encountered as well as the steps taken to work-around them.
