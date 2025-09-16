--
-- PostgreSQL database dump
--

-- \restrict 0xza5KA3rZdAqdVmwGMRR1fLCJR7MzbKdDugVb0hxayfm3ztj7pZGP8XlTzTQD5

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ActFormat; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActFormat" AS ENUM (
    'SINGLE',
    'SEVERAL'
);


ALTER TYPE public."ActFormat" OWNER TO postgres;

--
-- Name: ActStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActStatus" AS ENUM (
    'ONLINE',
    'OFFLINE'
);


ALTER TYPE public."ActStatus" OWNER TO postgres;

--
-- Name: ActType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ActType" AS ENUM (
    'SINGLE',
    'MULTI'
);


ALTER TYPE public."ActType" OWNER TO postgres;

--
-- Name: SelectionMethods; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SelectionMethods" AS ENUM (
    'VOTING',
    'BIDDING',
    'MANUAL'
);


ALTER TYPE public."SelectionMethods" OWNER TO postgres;

--
-- Name: UserStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserStatus" AS ENUM (
    'ACTIVE',
    'WARNED',
    'BLOCKED'
);


ALTER TYPE public."UserStatus" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Act; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Act" (
    id integer NOT NULL,
    "previewFileName" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "categoryId" integer,
    "userId" integer NOT NULL,
    status public."ActStatus" DEFAULT 'ONLINE'::public."ActStatus" NOT NULL,
    format public."ActFormat" DEFAULT 'SINGLE'::public."ActFormat" NOT NULL,
    sequel text,
    title text NOT NULL,
    type public."ActType" DEFAULT 'SINGLE'::public."ActType" NOT NULL,
    "biddingTime" text NOT NULL,
    "heroMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "navigatorMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL
);


ALTER TABLE public."Act" OWNER TO postgres;

--
-- Name: Act_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Act_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Act_id_seq" OWNER TO postgres;

--
-- Name: Act_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Act_id_seq" OWNED BY public."Act".id;


--
-- Name: Category; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Category" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Category" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Category_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Category_id_seq" OWNER TO postgres;

--
-- Name: Category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Category_id_seq" OWNED BY public."Category".id;


--
-- Name: Guild; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Guild" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "logoFileName" text,
    "ownerId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Guild" OWNER TO postgres;

--
-- Name: Guild_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Guild_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Guild_id_seq" OWNER TO postgres;

--
-- Name: Guild_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Guild_id_seq" OWNED BY public."Guild".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name text NOT NULL
);


ALTER TABLE public."Role" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Role_id_seq" OWNER TO postgres;

--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id integer NOT NULL,
    login text,
    password text NOT NULL,
    email text NOT NULL,
    status public."UserStatus" DEFAULT 'ACTIVE'::public."UserStatus" NOT NULL,
    "warningCount" integer DEFAULT 0 NOT NULL,
    "roleId" integer DEFAULT 1 NOT NULL,
    "terminateCount" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "refreshToken" text,
    "guildId" integer
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: UserActivity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserActivity" (
    id integer NOT NULL,
    action text NOT NULL,
    details jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer,
    "streamId" integer
);


ALTER TABLE public."UserActivity" OWNER TO postgres;

--
-- Name: UserActivityParticipants; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserActivityParticipants" (
    "userId" integer NOT NULL,
    "activityId" integer NOT NULL,
    role text
);


ALTER TABLE public."UserActivityParticipants" OWNER TO postgres;

--
-- Name: UserActivity_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."UserActivity_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."UserActivity_id_seq" OWNER TO postgres;

--
-- Name: UserActivity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."UserActivity_id_seq" OWNED BY public."UserActivity".id;


--
-- Name: User_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."User_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."User_id_seq" OWNER TO postgres;

--
-- Name: User_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."User_id_seq" OWNED BY public."User".id;


--
-- Name: _UserFollows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."_UserFollows" (
    "A" integer NOT NULL,
    "B" integer NOT NULL
);


ALTER TABLE public."_UserFollows" OWNER TO postgres;

--
-- Name: Act id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act" ALTER COLUMN id SET DEFAULT nextval('public."Act_id_seq"'::regclass);


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: Guild id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild" ALTER COLUMN id SET DEFAULT nextval('public."Guild_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserActivity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity" ALTER COLUMN id SET DEFAULT nextval('public."UserActivity_id_seq"'::regclass);


--
-- Data for Name: Act; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Act" (id, "previewFileName", "startedAt", "endedAt", "categoryId", "userId", status, format, sequel, title, type, "biddingTime", "heroMethods", "navigatorMethods") FROM stdin;
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name) FROM stdin;
\.


--
-- Data for Name: Guild; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Guild" (id, name, description, "logoFileName", "ownerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Role" (id, name) FROM stdin;
1	user
2	admin
3	main admin
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, login, password, email, status, "warningCount", "roleId", "terminateCount", "createdAt", "updatedAt", "refreshToken", "guildId") FROM stdin;
2	\N	$2b$10$7LZ1dTJVrDkZCzfXXwmaze66L8.1tOuGeKXg7HXeqbiFYKgJw80cm	vitaly.sadikov1@yandex.ru	ACTIVE	0	1	\N	2025-09-10 11:34:46.968	2025-09-10 11:34:50.591	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImxvZ2luIjpudWxsLCJpYXQiOjE3NTc1MDQwOTAsImV4cCI6MTc1ODEwODg5MH0.1uvyAb6oXh_kag5jgAg-qYD04rfCaX4qgiEwpv-TY18	\N
\.


--
-- Data for Name: UserActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivity" (id, action, details, "createdAt", "userId", "streamId") FROM stdin;
\.


--
-- Data for Name: UserActivityParticipants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivityParticipants" ("userId", "activityId", role) FROM stdin;
\.


--
-- Data for Name: _UserFollows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_UserFollows" ("A", "B") FROM stdin;
\.


--
-- Name: Act_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Act_id_seq"', 1, false);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 1, false);


--
-- Name: Guild_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Guild_id_seq"', 1, false);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 3, true);


--
-- Name: UserActivity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UserActivity_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 2, true);


--
-- Name: Act Act_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_pkey" PRIMARY KEY (id);


--
-- Name: Category Category_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category"
    ADD CONSTRAINT "Category_pkey" PRIMARY KEY (id);


--
-- Name: Guild Guild_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild"
    ADD CONSTRAINT "Guild_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: UserActivityParticipants UserActivityParticipants_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_pkey" PRIMARY KEY ("userId", "activityId");


--
-- Name: UserActivity UserActivity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _UserFollows _UserFollows_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: Guild_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Guild_name_key" ON public."Guild" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_login_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_login_key" ON public."User" USING btree (login);


--
-- Name: _UserFollows_B_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "_UserFollows_B_index" ON public."_UserFollows" USING btree ("B");


--
-- Name: Act Act_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Act Act_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserActivityParticipants UserActivityParticipants_activityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES public."UserActivity"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: UserActivityParticipants UserActivityParticipants_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivityParticipants"
    ADD CONSTRAINT "UserActivityParticipants_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserActivity UserActivity_streamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: UserActivity UserActivity_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity"
    ADD CONSTRAINT "UserActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_guildId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES public."Guild"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: _UserFollows _UserFollows_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_A_fkey" FOREIGN KEY ("A") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserFollows _UserFollows_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."_UserFollows"
    ADD CONSTRAINT "_UserFollows_B_fkey" FOREIGN KEY ("B") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

-- \unrestrict 0xza5KA3rZdAqdVmwGMRR1fLCJR7MzbKdDugVb0hxayfm3ztj7pZGP8XlTzTQD5

