ALTER TABLE "Vote" ADD CONSTRAINT "Vote_value_check" CHECK (value IN (1, -1));
