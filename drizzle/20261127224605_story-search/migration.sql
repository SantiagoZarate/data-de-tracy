ALTER TABLE `stories` ADD `transcript` text;
--> statement-breakpoint
CREATE VIRTUAL TABLE stories_fts USING fts5(
  title,
  summary,
  transcript,
  content='stories',
  content_rowid='id',
  tokenize='unicode61 remove_diacritics 2'
);
--> statement-breakpoint
INSERT INTO stories_fts(stories_fts) VALUES ('rebuild');
--> statement-breakpoint
CREATE TRIGGER stories_fts_insert AFTER INSERT ON stories BEGIN
  INSERT INTO stories_fts(rowid, title, summary, transcript)
  VALUES (new.id, new.title, new.summary, new.transcript);
END;
--> statement-breakpoint
CREATE TRIGGER stories_fts_update AFTER UPDATE OF id, title, summary, transcript ON stories
WHEN old.id IS NOT new.id
  OR old.title IS NOT new.title
  OR old.summary IS NOT new.summary
  OR old.transcript IS NOT new.transcript
BEGIN
  INSERT INTO stories_fts(stories_fts, rowid, title, summary, transcript)
  VALUES ('delete', old.id, old.title, old.summary, old.transcript);
  INSERT INTO stories_fts(rowid, title, summary, transcript)
  VALUES (new.id, new.title, new.summary, new.transcript);
END;
--> statement-breakpoint
CREATE TRIGGER stories_fts_delete AFTER DELETE ON stories BEGIN
  INSERT INTO stories_fts(stories_fts, rowid, title, summary, transcript)
  VALUES ('delete', old.id, old.title, old.summary, old.transcript);
END;
