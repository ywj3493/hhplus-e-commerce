# Project Policy

## Development Workflow

### Issue-Driven Development
All development tasks must start with an issue document.

#### Issue Creation
1. Create a new issue file in `/docs/issue/`
2. Follow naming convention: `issue{NNN}.md` (e.g., `issue001.md`, `issue002.md`)
3. Use 3-digit zero-padding for issue numbers
4. Document the problem, requirements, and acceptance criteria

#### Branch Management
1. Create a new branch from `main` for each issue
2. Branch naming format: `{type}/{issue-number}`
   - `feature/{NNN}` - New features
   - `bugfix/{NNN}` - Bug fixes
   - `docs/{NNN}` - Documentation updates
   - Examples: `feature/001`, `bugfix/002`, `docs/003`

#### Commit Guidelines
- Reference issue number in commit messages
- Use clear, descriptive commit messages
- Make atomic commits (one logical change per commit)

#### Pull Request Process
1. Create PR from feature branch to `main`
2. Reference the issue number in PR description
3. Ensure all documentation is updated
4. Code review required before merge

## Documentation Standards

### Language Usage
- **Korean**: Development specs and internal communication
  - `/docs/dev/*` - Requirements, use cases, API specs
  - `/docs/reference/*` - Assignments and reference materials
- **English**: Project-level documentation and AI collaboration
  - Root-level markdown files
  - Technical architecture documents
  - `/docs/issue/*` - Issue tracking documents (for Claude collaboration)

### Documentation Sequence
Documents must be created and maintained in this order:

1. **Requirements Analysis** (`/docs/dev/requirements.md`)
   - Business requirements
   - Technical constraints
   - Functional specifications

2. **Use Cases** (`/docs/dev/user-stories.md`)
   - User stories
   - Actor definitions
   - Scenario descriptions

3. **API Specifications** (`/docs/dev/api-spec.md`)
   - Endpoint definitions
   - Request/Response schemas
   - Error codes

4. **Sequence Diagrams** (`/docs/dev/sequence-diagrams.md`)
   - Process flows
   - System interactions
   - Edge cases

### Documentation Updates
- Update documentation BEFORE implementation
- Keep docs in sync with code changes
- Review documentation during PR process

## File Organization

### Directory Structure
```
/
   CLAUDE.md                 # Project context for Claude
   docs/
      policy.md            # This file
      dev/                 # Development documentation (Korean)
         requirements.md
         user-stories.md
         api-spec.md
         sequence-diagrams.md
      issue/               # Issue tracking (English)
         issue001.md
         issue002.md
         ...
      reference/           # Reference materials (Korean)
          assignment/
   src/                     # Source code (TBD)
```

## Technology Stack

### Current Stack
- **Framework**: NestJS
- **ORM**: Prisma
- **Language**: TypeScript (assumed)

### Architecture
- Architecture pattern: TBD (To Be Decided)
- Will be documented as decisions are made

## Version Control

### Git Workflow
1. `main` branch is protected
2. All changes via feature branches
3. No direct commits to `main`
4. Squash merges preferred for clean history

### Commit Message Format
```
[#issue-number] Brief description

Detailed explanation if needed
```

Example:
```
[#001] Add user authentication endpoints

Implement login and registration API endpoints
```

## Code Review

### Review Checklist
- [ ] Code follows project standards
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No breaking changes (or documented)
- [ ] Issue requirements are met

## Notes
- This policy document will evolve as the project grows
- All team members should review and follow these guidelines
- Exceptions require documentation and approval
