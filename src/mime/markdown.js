// Draft bodies are CommonMark. commonmark.js is the dialect's reference implementation.
import { HtmlRenderer, Parser } from "commonmark";

export const renderMarkdown = (markdown) => new HtmlRenderer().render(new Parser().parse(markdown));
