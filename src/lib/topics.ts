/**
 * Topics and the governing formula inside each syllabus chapter.
 *
 * `chapter` tells a student which part of the book to open. It does not tell
 * them what to practise: "Current Electricity, 90 questions" is a term's work,
 * while "Kirchhoff's laws, 18 questions, always the same loop equation" is an
 * evening's. This table carries that second level.
 *
 * `keywords` place a question inside a topic, scored the way chapters are.
 * `formula` is the relation the topic actually tests, written as a student
 * would put it on a revision card, and shown beside the count so a chapter's
 * pattern reads as "this came up nine times, and every time it was this".
 *
 * Depth is proportional to how often a chapter is examined. A chapter absent
 * from this table still reports at chapter level; a question matching none of
 * its chapter's topics is counted under the chapter but outside any topic,
 * which the report states rather than hides.
 *
 * Authored by hand. Keep the keywords lowercase.
 */
export type Topic = { topic: string; keywords: string[]; formula: string };

import raw from '../../data/topics.json';

/**
 * The table lives in data/topics.json so that the seeder, which is plain
 * Node, and the app, which is TypeScript, read the very same file. It used to
 * be a literal in this module, which meant the seeder could not see it and
 * every question had to be re-tagged at request time.
 */
export const TOPICS = raw as Record<string, Record<string, Topic[]>>;
