ALTER TABLE public.test_cases DROP CONSTRAINT test_cases_review_status_check;
ALTER TABLE public.test_cases ADD CONSTRAINT test_cases_review_status_check CHECK (review_status IN ('unreviewed','needs_review','reviewed','Provisional — Clinical Review Required'));
ALTER TABLE public.test_cases DROP CONSTRAINT test_cases_execution_status_check;
ALTER TABLE public.test_cases ADD CONSTRAINT test_cases_execution_status_check CHECK (execution_status IN ('not_executed','pass','fail','unavailable'));