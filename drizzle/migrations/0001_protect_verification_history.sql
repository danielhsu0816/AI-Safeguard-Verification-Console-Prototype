ALTER TABLE public.evaluations ADD COLUMN registry_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sources ADD COLUMN passage_hash text;
UPDATE public.sources SET passage_hash = 'sha256:' || encode(sha256(convert_to(coalesce(approved_passage,''),'UTF8')), 'hex');

REVOKE INSERT, UPDATE, DELETE ON public.sources, public.rules, public.notes, public.note_versions, public.test_cases, public.evaluations, public.review_actions, public.audit_events, public.app_settings FROM authenticated, anon;
GRANT SELECT ON public.sources, public.rules, public.notes, public.note_versions, public.test_cases, public.evaluations, public.review_actions, public.audit_events, public.app_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_history_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 RAISE EXCEPTION 'Historical records are immutable; append a new record instead';
END $$;
CREATE TRIGGER immutable_evaluations BEFORE UPDATE OR DELETE ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.reject_history_change();
CREATE TRIGGER immutable_review_actions BEFORE UPDATE OR DELETE ON public.review_actions FOR EACH ROW EXECUTE FUNCTION public.reject_history_change();
CREATE TRIGGER immutable_note_versions BEFORE UPDATE OR DELETE ON public.note_versions FOR EACH ROW EXECUTE FUNCTION public.reject_history_change();
CREATE TRIGGER immutable_audit_events BEFORE UPDATE OR DELETE ON public.audit_events FOR EACH ROW EXECUTE FUNCTION public.reject_history_change();

CREATE OR REPLACE FUNCTION public.audit_evaluation_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 INSERT INTO public.audit_events(actor_id,event_type,test_case_id,note_version,evaluation_id,rule_id,guardrail_decision,failure_reason,model_version,source_bundle_version)
 VALUES(NEW.evaluated_by,'evaluation_recorded',NEW.test_case_id,NEW.note_version,NEW.id,NEW.rule_id,NEW.decision,array_to_string(NEW.reason_codes,','),NEW.model_version,NEW.source_bundle_version);
 RETURN NEW;
END $$;
CREATE TRIGGER record_evaluation_audit AFTER INSERT ON public.evaluations FOR EACH ROW EXECUTE FUNCTION public.audit_evaluation_insert();

CREATE OR REPLACE FUNCTION public.audit_review_insert() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE ev public.evaluations;
BEGIN
 SELECT * INTO STRICT ev FROM public.evaluations WHERE id=NEW.evaluation_id;
 INSERT INTO public.audit_events(actor_id,event_type,test_case_id,note_version,evaluation_id,rule_id,guardrail_decision,model_version,source_bundle_version,reviewer_action)
 VALUES(NEW.reviewer_id,'human_review',ev.test_case_id,ev.note_version,ev.id,ev.rule_id,ev.decision,ev.model_version,ev.source_bundle_version,NEW.action);
 RETURN NEW;
END $$;
CREATE TRIGGER record_review_audit AFTER INSERT ON public.review_actions FOR EACH ROW EXECUTE FUNCTION public.audit_review_insert();

CREATE OR REPLACE FUNCTION public.handle_new_user_role() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(4172660);
 INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'reviewer') ON CONFLICT DO NOTHING;
 IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE role='admin') THEN
  INSERT INTO public.user_roles(user_id,role) VALUES(NEW.id,'admin') ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;