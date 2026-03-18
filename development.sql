-- Schema
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.8 (6108b59)
-- Dumped by pg_dump version 17.8 (6108b59)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: addresses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.addresses (
    id integer NOT NULL,
    constituent_id integer,
    address_type character varying(50) DEFAULT 'Home'::character varying,
    street_line1 character varying(200),
    street_line2 character varying(200),
    city character varying(100),
    state character varying(50),
    postal_code character varying(20),
    country character varying(100) DEFAULT 'United States'::character varying,
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.addresses OWNER TO neondb_owner;

--
-- Name: addresses_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.addresses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addresses_id_seq OWNER TO neondb_owner;

--
-- Name: addresses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.addresses_id_seq OWNED BY public.addresses.id;


--
-- Name: auth_accounts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_accounts (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    type character varying(255) NOT NULL,
    provider character varying(255) NOT NULL,
    "providerAccountId" character varying(255) NOT NULL,
    refresh_token text,
    access_token text,
    expires_at bigint,
    id_token text,
    scope text,
    session_state text,
    token_type text,
    password text
);


ALTER TABLE public.auth_accounts OWNER TO neondb_owner;

--
-- Name: auth_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_accounts_id_seq OWNER TO neondb_owner;

--
-- Name: auth_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_accounts_id_seq OWNED BY public.auth_accounts.id;


--
-- Name: auth_sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_sessions (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    expires timestamp with time zone NOT NULL,
    "sessionToken" character varying(255) NOT NULL
);


ALTER TABLE public.auth_sessions OWNER TO neondb_owner;

--
-- Name: auth_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_sessions_id_seq OWNER TO neondb_owner;

--
-- Name: auth_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_sessions_id_seq OWNED BY public.auth_sessions.id;


--
-- Name: auth_users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_users (
    id integer NOT NULL,
    name character varying(255),
    email character varying(255),
    "emailVerified" timestamp with time zone,
    image text,
    failed_login_attempts integer DEFAULT 0,
    locked_until timestamp without time zone,
    last_login_at timestamp without time zone
);


ALTER TABLE public.auth_users OWNER TO neondb_owner;

--
-- Name: auth_users_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.auth_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.auth_users_id_seq OWNER TO neondb_owner;

--
-- Name: auth_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.auth_users_id_seq OWNED BY public.auth_users.id;


--
-- Name: auth_verification_token; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.auth_verification_token (
    identifier text NOT NULL,
    expires timestamp with time zone NOT NULL,
    token text NOT NULL
);


ALTER TABLE public.auth_verification_token OWNER TO neondb_owner;

--
-- Name: constituents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.constituents (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    middle_name character varying(100),
    last_name character varying(100) NOT NULL,
    nick_name character varying(100),
    addressee character varying(50) DEFAULT 'Mr. and Mrs.'::character varying,
    salutation character varying(50) DEFAULT 'Dear Friends'::character varying,
    organization character varying(200),
    constituent_type character varying(50) DEFAULT 'Individual'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.constituents OWNER TO neondb_owner;

--
-- Name: constituents_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.constituents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.constituents_id_seq OWNER TO neondb_owner;

--
-- Name: constituents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.constituents_id_seq OWNED BY public.constituents.id;


--
-- Name: contact_info; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.contact_info (
    id integer NOT NULL,
    constituent_id integer,
    contact_type character varying(50),
    contact_value character varying(200),
    is_primary boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.contact_info OWNER TO neondb_owner;

--
-- Name: contact_info_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.contact_info_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contact_info_id_seq OWNER TO neondb_owner;

--
-- Name: contact_info_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.contact_info_id_seq OWNED BY public.contact_info.id;


--
-- Name: custom_attributes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.custom_attributes (
    id integer NOT NULL,
    constituent_id integer,
    attribute_name character varying(100),
    attribute_value text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.custom_attributes OWNER TO neondb_owner;

--
-- Name: custom_attributes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.custom_attributes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.custom_attributes_id_seq OWNER TO neondb_owner;

--
-- Name: custom_attributes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.custom_attributes_id_seq OWNED BY public.custom_attributes.id;


--
-- Name: event_participation; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.event_participation (
    id integer NOT NULL,
    constituent_id integer,
    event_id integer,
    attendance_status character varying(50) DEFAULT 'Registered'::character varying,
    ticket_type character varying(100),
    amount_paid numeric(10,2),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.event_participation OWNER TO neondb_owner;

--
-- Name: event_participation_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.event_participation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.event_participation_id_seq OWNER TO neondb_owner;

--
-- Name: event_participation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.event_participation_id_seq OWNED BY public.event_participation.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.events (
    id integer NOT NULL,
    event_name character varying(200) NOT NULL,
    event_date date,
    event_type character varying(100),
    location character varying(200),
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO neondb_owner;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO neondb_owner;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: gifts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.gifts (
    id integer NOT NULL,
    constituent_id integer,
    gift_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    gift_type character varying(50) DEFAULT 'Cash'::character varying,
    campaign character varying(100),
    fund character varying(100),
    payment_method character varying(50),
    acknowledgment_sent boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.gifts OWNER TO neondb_owner;

--
-- Name: gifts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.gifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gifts_id_seq OWNER TO neondb_owner;

--
-- Name: gifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.gifts_id_seq OWNED BY public.gifts.id;


--
-- Name: login_attempts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.login_attempts (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    ip_address character varying(45),
    attempted_at timestamp without time zone DEFAULT now(),
    was_successful boolean DEFAULT false
);


ALTER TABLE public.login_attempts OWNER TO neondb_owner;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.login_attempts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.login_attempts_id_seq OWNER TO neondb_owner;

--
-- Name: login_attempts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.login_attempts_id_seq OWNED BY public.login_attempts.id;


--
-- Name: lookup_tables; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lookup_tables (
    id integer NOT NULL,
    table_key character varying(100) NOT NULL,
    display_name character varying(200) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lookup_tables OWNER TO neondb_owner;

--
-- Name: lookup_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lookup_tables_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lookup_tables_id_seq OWNER TO neondb_owner;

--
-- Name: lookup_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lookup_tables_id_seq OWNED BY public.lookup_tables.id;


--
-- Name: lookup_values; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.lookup_values (
    id integer NOT NULL,
    table_key character varying(100) NOT NULL,
    label character varying(200) NOT NULL,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.lookup_values OWNER TO neondb_owner;

--
-- Name: lookup_values_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.lookup_values_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lookup_values_id_seq OWNER TO neondb_owner;

--
-- Name: lookup_values_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.lookup_values_id_seq OWNED BY public.lookup_values.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    constituent_id integer,
    note_type character varying(50),
    note_content text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notes OWNER TO neondb_owner;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notes_id_seq OWNER TO neondb_owner;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.password_reset_tokens (
    id integer NOT NULL,
    token character varying(255) NOT NULL,
    user_id integer,
    used boolean DEFAULT false,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.password_reset_tokens OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.password_reset_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_id_seq OWNER TO neondb_owner;

--
-- Name: password_reset_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.password_reset_tokens_id_seq OWNED BY public.password_reset_tokens.id;


--
-- Name: relationships; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.relationships (
    id integer NOT NULL,
    constituent_id integer,
    related_constituent_id integer,
    relationship_type character varying(100),
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.relationships OWNER TO neondb_owner;

--
-- Name: relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.relationships_id_seq OWNER TO neondb_owner;

--
-- Name: relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.relationships_id_seq OWNED BY public.relationships.id;


--
-- Name: addresses id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addresses ALTER COLUMN id SET DEFAULT nextval('public.addresses_id_seq'::regclass);


--
-- Name: auth_accounts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts ALTER COLUMN id SET DEFAULT nextval('public.auth_accounts_id_seq'::regclass);


--
-- Name: auth_sessions id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions ALTER COLUMN id SET DEFAULT nextval('public.auth_sessions_id_seq'::regclass);


--
-- Name: auth_users id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_users ALTER COLUMN id SET DEFAULT nextval('public.auth_users_id_seq'::regclass);


--
-- Name: constituents id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.constituents ALTER COLUMN id SET DEFAULT nextval('public.constituents_id_seq'::regclass);


--
-- Name: contact_info id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_info ALTER COLUMN id SET DEFAULT nextval('public.contact_info_id_seq'::regclass);


--
-- Name: custom_attributes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_attributes ALTER COLUMN id SET DEFAULT nextval('public.custom_attributes_id_seq'::regclass);


--
-- Name: event_participation id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.event_participation ALTER COLUMN id SET DEFAULT nextval('public.event_participation_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: gifts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gifts ALTER COLUMN id SET DEFAULT nextval('public.gifts_id_seq'::regclass);


--
-- Name: login_attempts id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_attempts ALTER COLUMN id SET DEFAULT nextval('public.login_attempts_id_seq'::regclass);


--
-- Name: lookup_tables id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_tables ALTER COLUMN id SET DEFAULT nextval('public.lookup_tables_id_seq'::regclass);


--
-- Name: lookup_values id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_values ALTER COLUMN id SET DEFAULT nextval('public.lookup_values_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: password_reset_tokens id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN id SET DEFAULT nextval('public.password_reset_tokens_id_seq'::regclass);


--
-- Name: relationships id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.relationships ALTER COLUMN id SET DEFAULT nextval('public.relationships_id_seq'::regclass);


--
-- Name: addresses addresses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);


--
-- Name: auth_accounts auth_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT auth_accounts_pkey PRIMARY KEY (id);


--
-- Name: auth_sessions auth_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT auth_sessions_pkey PRIMARY KEY (id);


--
-- Name: auth_users auth_users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_users
    ADD CONSTRAINT auth_users_pkey PRIMARY KEY (id);


--
-- Name: auth_verification_token auth_verification_token_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_verification_token
    ADD CONSTRAINT auth_verification_token_pkey PRIMARY KEY (identifier, token);


--
-- Name: constituents constituents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.constituents
    ADD CONSTRAINT constituents_pkey PRIMARY KEY (id);


--
-- Name: contact_info contact_info_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_info
    ADD CONSTRAINT contact_info_pkey PRIMARY KEY (id);


--
-- Name: custom_attributes custom_attributes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_attributes
    ADD CONSTRAINT custom_attributes_pkey PRIMARY KEY (id);


--
-- Name: event_participation event_participation_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: gifts gifts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_pkey PRIMARY KEY (id);


--
-- Name: login_attempts login_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.login_attempts
    ADD CONSTRAINT login_attempts_pkey PRIMARY KEY (id);


--
-- Name: lookup_tables lookup_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_tables
    ADD CONSTRAINT lookup_tables_pkey PRIMARY KEY (id);


--
-- Name: lookup_tables lookup_tables_table_key_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_tables
    ADD CONSTRAINT lookup_tables_table_key_key UNIQUE (table_key);


--
-- Name: lookup_values lookup_values_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT lookup_values_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: relationships relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_pkey PRIMARY KEY (id);


--
-- Name: idx_addresses_constituent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_addresses_constituent ON public.addresses USING btree (constituent_id);


--
-- Name: idx_constituents_last_name; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_constituents_last_name ON public.constituents USING btree (last_name);


--
-- Name: idx_constituents_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_constituents_type ON public.constituents USING btree (constituent_type);


--
-- Name: idx_contact_info_constituent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_contact_info_constituent ON public.contact_info USING btree (constituent_id);


--
-- Name: idx_event_participation_constituent; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_event_participation_constituent ON public.event_participation USING btree (constituent_id);


--
-- Name: idx_gifts_amount; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gifts_amount ON public.gifts USING btree (amount);


--
-- Name: idx_gifts_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_gifts_date ON public.gifts USING btree (gift_date);


--
-- Name: idx_login_attempts_attempted_at; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_login_attempts_attempted_at ON public.login_attempts USING btree (attempted_at);


--
-- Name: idx_login_attempts_email; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_login_attempts_email ON public.login_attempts USING btree (email);


--
-- Name: idx_lookup_values_table_key; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_lookup_values_table_key ON public.lookup_values USING btree (table_key);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: addresses addresses_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.addresses
    ADD CONSTRAINT addresses_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: auth_accounts auth_accounts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_accounts
    ADD CONSTRAINT "auth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: auth_sessions auth_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.auth_sessions
    ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: contact_info contact_info_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.contact_info
    ADD CONSTRAINT contact_info_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: custom_attributes custom_attributes_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.custom_attributes
    ADD CONSTRAINT custom_attributes_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: event_participation event_participation_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: event_participation event_participation_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.event_participation
    ADD CONSTRAINT event_participation_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE CASCADE;


--
-- Name: gifts gifts_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.gifts
    ADD CONSTRAINT gifts_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: lookup_values lookup_values_table_key_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.lookup_values
    ADD CONSTRAINT lookup_values_table_key_fkey FOREIGN KEY (table_key) REFERENCES public.lookup_tables(table_key) ON DELETE CASCADE;


--
-- Name: notes notes_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.auth_users(id) ON DELETE CASCADE;


--
-- Name: relationships relationships_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_constituent_id_fkey FOREIGN KEY (constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: relationships relationships_related_constituent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.relationships
    ADD CONSTRAINT relationships_related_constituent_id_fkey FOREIGN KEY (related_constituent_id) REFERENCES public.constituents(id) ON DELETE CASCADE;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--



-- Data
COPY "constituents" FROM stdin;
1	Chiquita	\N	Banana	Chiki	Ms.	Dear	\N	Individual	2026-03-12 03:18:50.168009	2026-03-12 03:58:36.408

\.

COPY "auth_users" FROM stdin;
1	chels.santoro@gmail.com	chels.santoro@gmail.com	\N	\N	0	\N	2026-03-12 03:18:11.481133

\.

COPY "auth_accounts" FROM stdin;
1	1	credentials	credentials	1	\N	\N	\N	\N	\N	\N	\N	$argon2id$v=19$m=65536,t=3,p=4$31bshP24hoJczsKelHcLww$i5TIjGdmRk1DcFDqkqC0Z9JLvc1xJE62F/X/KR28Ghk

\.

COPY "login_attempts" FROM stdin;
1	chels.santoro@gmail.com	unknown	2026-03-12 03:18:11.290194	t

\.

COPY "lookup_tables" FROM stdin;
1	constituent_type	Constituent Type	Types of constituents (Individual, Organization, etc.)	2026-03-12 03:46:41.094705
2	addressee	Addressee	Addressee prefixes for mail	2026-03-12 03:46:41.094705
3	salutation	Salutation	Greeting salutations for correspondence	2026-03-12 03:46:41.094705
4	address_type	Address Type	Types of addresses (Home, Work, etc.)	2026-03-12 03:46:41.094705
5	contact_type	Contact Type	Types of contact info (Email, Phone, etc.)	2026-03-12 03:46:41.094705
6	gift_type	Gift Type	Types of gifts/donations	2026-03-12 03:46:41.094705
7	payment_method	Payment Method	Methods of payment for gifts	2026-03-12 03:46:41.094705

\.

COPY "lookup_values" FROM stdin;
1	constituent_type	Individual	1	t	2026-03-12 03:46:41.094705
2	constituent_type	Organization	2	t	2026-03-12 03:46:41.094705
3	constituent_type	Foundation	3	t	2026-03-12 03:46:41.094705
4	addressee	Mr. and Mrs.	1	t	2026-03-12 03:46:41.094705
5	addressee	Mr.	2	t	2026-03-12 03:46:41.094705
6	addressee	Mrs.	3	t	2026-03-12 03:46:41.094705
7	addressee	Ms.	4	t	2026-03-12 03:46:41.094705
8	addressee	Dr.	5	t	2026-03-12 03:46:41.094705
9	addressee	The Family	6	t	2026-03-12 03:46:41.094705
10	salutation	Dear Friends	1	t	2026-03-12 03:46:41.094705
11	salutation	Dear Friend	2	t	2026-03-12 03:46:41.094705
12	salutation	Dear	3	t	2026-03-12 03:46:41.094705
13	address_type	Home	1	t	2026-03-12 03:46:41.094705
14	address_type	Work	2	t	2026-03-12 03:46:41.094705
15	address_type	Mailing	3	t	2026-03-12 03:46:41.094705
16	contact_type	Email	1	t	2026-03-12 03:46:41.094705
17	contact_type	Phone	2	t	2026-03-12 03:46:41.094705
18	contact_type	Mobile	3	t	2026-03-12 03:46:41.094705
19	contact_type	Fax	4	t	2026-03-12 03:46:41.094705
20	gift_type	Cash	1	t	2026-03-12 03:46:41.094705
21	gift_type	Check	2	t	2026-03-12 03:46:41.094705
22	gift_type	Credit Card	3	t	2026-03-12 03:46:41.094705
23	gift_type	Stock	4	t	2026-03-12 03:46:41.094705
24	gift_type	In-Kind	5	t	2026-03-12 03:46:41.094705
25	payment_method	Cash	1	t	2026-03-12 03:46:41.094705
26	payment_method	Check	2	t	2026-03-12 03:46:41.094705
27	payment_method	Credit Card	3	t	2026-03-12 03:46:41.094705
28	payment_method	Wire Transfer	4	t	2026-03-12 03:46:41.094705
29	payment_method	Online	5	t	2026-03-12 03:46:41.094705

\.
