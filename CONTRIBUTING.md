# Contributing to Home Assistant MCP

Thank you for your interest in contributing to the Home Assistant Model Context Protocol Server! 🎉

## 🚀 Quick Start

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR-USERNAME/advanced-homeassistant-mcp.git`
3. Install dependencies: `bun install`
4. Create a feature branch: `git checkout -b feature/my-feature`
5. Make your changes
6. Run tests: `bun test`
7. Lint your code: `bun run lint`
8. Commit and push your changes
9. Open a Pull Request

## 📋 Development Guidelines

### Code Quality

- Write clean, readable TypeScript code
- Follow existing code patterns and style
- Add comments for complex logic
- Keep functions small and focused
- Use proper TypeScript types (avoid `any`)
- Follow ESLint and Prettier configurations

### Testing

- Add tests for new features
- Ensure all existing tests pass
- Test edge cases and error conditions
- Aim for good test coverage
- Run `bun test` before committing

### Documentation

- Update README.md if adding features
- Document new tools in docs/TOOLS_REFERENCE.md
- Add JSDoc comments for public APIs
- Include usage examples
- Update CHANGELOG.md following [Keep a Changelog](https://keepachangelog.com/)

## 🐛 Reporting Bugs

Found a bug? Help us fix it!

1. Check if it's already reported in [Issues](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues)
2. If not, create a new issue with:
   - Clear, descriptive title
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment details (OS, Bun version, Home Assistant version)
   - Relevant logs or error messages

## 💡 Feature Requests

Have an idea? We'd love to hear it!

1. Check existing [Issues](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues) and [Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
2. Create a new issue or discussion with:
   - Use case description
   - Proposed solution
   - Alternative approaches considered
   - Examples or mockups if applicable

## 🔄 Pull Request Process

1. **Fork and Branch**: Create a feature branch from `main`
2. **Code**: Write your code following our guidelines
3. **Test**: Ensure all tests pass (`bun test`)
4. **Lint**: Run linter (`bun run lint`)
5. **Commit**: Write clear, descriptive commit messages
6. **Push**: Push to your fork
7. **PR**: Open a Pull Request with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Testing notes

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): subject

body (optional)

footer (optional)
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:
```
feat(aurora): add new beat detection algorithm
fix(lights): handle unavailable devices gracefully
docs(readme): update installation instructions
```

## 🌟 Recognition

Contributors will be:
- Listed in the project README
- Mentioned in release notes
- Credited in documentation
- Part of our community

## 📚 Additional Resources

- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Tools Reference](docs/TOOLS_REFERENCE.md)
- [Security Guide](docs/SECURITY.md)

## 🤝 Code of Conduct

### Our Standards

- Be respectful and inclusive
- Welcome diverse perspectives
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

### Unacceptable Behavior

- Harassment, discrimination, or hate speech
- Trolling, insulting, or derogatory comments
- Personal or political attacks
- Publishing others' private information
- Any other unprofessional conduct

## 💬 Getting Help

Need assistance?

- Check the [FAQ](docs/FAQ.md)
- Review [Documentation](docs/)
- Ask in [Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
- Refer to [Troubleshooting Guide](docs/TROUBLESHOOTING.md)

## 📝 License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSE](LICENSE)).

---

**Thank you for contributing to Home Assistant MCP!** Your efforts help make smart home control more accessible and powerful for everyone. 🏠🤖
