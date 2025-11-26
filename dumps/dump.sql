--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


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
-- Name: Achievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Achievement" (
    id integer NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Achievement" OWNER TO postgres;

--
-- Name: Achievement_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Achievement_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Achievement_id_seq" OWNER TO postgres;

--
-- Name: Achievement_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Achievement_id_seq" OWNED BY public."Achievement".id;


--
-- Name: Act; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Act" (
    id integer NOT NULL,
    title text NOT NULL,
    "previewFileName" text,
    "sequelId" integer,
    type public."ActType" DEFAULT 'SINGLE'::public."ActType" NOT NULL,
    format public."ActFormat" DEFAULT 'SINGLE'::public."ActFormat" NOT NULL,
    "heroMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "navigatorMethods" public."SelectionMethods" DEFAULT 'VOTING'::public."SelectionMethods" NOT NULL,
    "biddingTime" text NOT NULL,
    "introId" integer NOT NULL,
    "outroId" integer NOT NULL,
    status public."ActStatus" DEFAULT 'ONLINE'::public."ActStatus" NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endedAt" timestamp(3) without time zone,
    "categoryId" integer,
    "userId" integer NOT NULL
);


ALTER TABLE public."Act" OWNER TO postgres;

--
-- Name: ActMusic; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActMusic" (
    "actId" integer NOT NULL,
    "musicId" integer NOT NULL,
    "order" integer DEFAULT 0 NOT NULL
);


ALTER TABLE public."ActMusic" OWNER TO postgres;

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
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessage" (
    id integer NOT NULL,
    message text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "userId" integer NOT NULL,
    "actId" integer NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO postgres;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ChatMessage_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ChatMessage_id_seq" OWNER TO postgres;

--
-- Name: ChatMessage_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ChatMessage_id_seq" OWNED BY public."ChatMessage".id;


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
-- Name: Intro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Intro" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Intro" OWNER TO postgres;

--
-- Name: Intro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Intro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Intro_id_seq" OWNER TO postgres;

--
-- Name: Intro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Intro_id_seq" OWNED BY public."Intro".id;


--
-- Name: Music; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Music" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    length text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Music" OWNER TO postgres;

--
-- Name: Music_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Music_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Music_id_seq" OWNER TO postgres;

--
-- Name: Music_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Music_id_seq" OWNED BY public."Music".id;


--
-- Name: Outro; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Outro" (
    id integer NOT NULL,
    "fileName" text NOT NULL,
    "userId" integer
);


ALTER TABLE public."Outro" OWNER TO postgres;

--
-- Name: Outro_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Outro_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Outro_id_seq" OWNER TO postgres;

--
-- Name: Outro_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Outro_id_seq" OWNED BY public."Outro".id;


--
-- Name: Rank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Rank" (
    id integer NOT NULL,
    name text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Rank" OWNER TO postgres;

--
-- Name: Rank_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Rank_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Rank_id_seq" OWNER TO postgres;

--
-- Name: Rank_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Rank_id_seq" OWNED BY public."Rank".id;


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
-- Name: Sequel; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Sequel" (
    id integer NOT NULL,
    title text NOT NULL,
    episodes integer NOT NULL,
    "coverFileName" text,
    "userId" integer NOT NULL
);


ALTER TABLE public."Sequel" OWNER TO postgres;

--
-- Name: Sequel_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Sequel_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Sequel_id_seq" OWNER TO postgres;

--
-- Name: Sequel_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Sequel_id_seq" OWNED BY public."Sequel".id;


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
-- Name: UserAchievement; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserAchievement" (
    "userId" integer NOT NULL,
    "achievementId" integer NOT NULL,
    "awardedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."UserAchievement" OWNER TO postgres;

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
-- Name: UserRank; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."UserRank" (
    "userId" integer NOT NULL,
    "rankId" integer NOT NULL
);


ALTER TABLE public."UserRank" OWNER TO postgres;

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
-- Name: Achievement id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achievement" ALTER COLUMN id SET DEFAULT nextval('public."Achievement_id_seq"'::regclass);


--
-- Name: Act id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act" ALTER COLUMN id SET DEFAULT nextval('public."Act_id_seq"'::regclass);


--
-- Name: Category id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Category" ALTER COLUMN id SET DEFAULT nextval('public."Category_id_seq"'::regclass);


--
-- Name: ChatMessage id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage" ALTER COLUMN id SET DEFAULT nextval('public."ChatMessage_id_seq"'::regclass);


--
-- Name: Guild id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild" ALTER COLUMN id SET DEFAULT nextval('public."Guild_id_seq"'::regclass);


--
-- Name: Intro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro" ALTER COLUMN id SET DEFAULT nextval('public."Intro_id_seq"'::regclass);


--
-- Name: Music id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music" ALTER COLUMN id SET DEFAULT nextval('public."Music_id_seq"'::regclass);


--
-- Name: Outro id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro" ALTER COLUMN id SET DEFAULT nextval('public."Outro_id_seq"'::regclass);


--
-- Name: Rank id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rank" ALTER COLUMN id SET DEFAULT nextval('public."Rank_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: Sequel id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel" ALTER COLUMN id SET DEFAULT nextval('public."Sequel_id_seq"'::regclass);


--
-- Name: User id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User" ALTER COLUMN id SET DEFAULT nextval('public."User_id_seq"'::regclass);


--
-- Name: UserActivity id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserActivity" ALTER COLUMN id SET DEFAULT nextval('public."UserActivity_id_seq"'::regclass);


--
-- Data for Name: Achievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Achievement" (id, name, "createdAt") FROM stdin;
1	Набрать 100 просмотров	2025-11-26 12:49:07.856
\.


--
-- Data for Name: Act; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Act" (id, title, "previewFileName", "sequelId", type, format, "heroMethods", "navigatorMethods", "biddingTime", "introId", "outroId", status, "startedAt", "endedAt", "categoryId", "userId") FROM stdin;
2	CS 2 Faceit Stream	/uploads/acts/1764168347490-953015327.jpg	\N	SINGLE	SINGLE	VOTING	VOTING	2025-09-15T12:00:00Z	1	1	ONLINE	2025-11-26 14:45:47.52	\N	\N	1
\.


--
-- Data for Name: ActMusic; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActMusic" ("actId", "musicId", "order") FROM stdin;
2	1	0
2	2	1
2	3	2
\.


--
-- Data for Name: Category; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Category" (id, name) FROM stdin;
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessage" (id, message, "createdAt", "userId", "actId") FROM stdin;
\.


--
-- Data for Name: Guild; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Guild" (id, name, description, "logoFileName", "ownerId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Intro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Intro" (id, "fileName", "userId") FROM stdin;
1	uploads/intros/1764162877115-75180112.mp4	\N
\.


--
-- Data for Name: Music; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Music" (id, "fileName", length, "userId") FROM stdin;
2	uploads/musics/1764163138794-489981590.mp3	03:37	\N
3	uploads/musics/1764163174564-188746375.mp3	03:36	\N
1	uploads/musics/1764162991178-85189419.mp3	02:59	\N
\.


--
-- Data for Name: Outro; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Outro" (id, "fileName", "userId") FROM stdin;
1	uploads/outros/1764162796083-644659628.mp4	\N
\.


--
-- Data for Name: Rank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Rank" (id, name, "createdAt") FROM stdin;
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
-- Data for Name: Sequel; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Sequel" (id, title, episodes, "coverFileName", "userId") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, login, password, email, status, "warningCount", "roleId", "terminateCount", "createdAt", "updatedAt", "refreshToken", "guildId") FROM stdin;
2	vitalysadikov9@gmail.com	$2b$10$FnGfnHFYSS8DsS2lWbCQEOuYoEalNHGH4TJbOpR1jUZ7qQkkvcASm	vitalysadikov9@gmail.com	ACTIVE	0	1	\N	2025-11-26 13:35:49.708	2025-11-26 13:35:49.736	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjIsImxvZ2luIjoidml0YWx5c2FkaWtvdjlAZ21haWwuY29tIiwiaWF0IjoxNzY0MTY0MTQ5LCJleHAiOjE3NjQ3Njg5NDl9.I-Nf3fjG3We-mpaLGN6IqRLbc51o1jESFG_aSPMXifo	\N
1	\N	$2b$10$2DkduXtBD8ewN/Q3yaDksuwl5GomzvmnO.52mgaz7qAl0rC2rgywW	vitaly.sadikov1@yandex.ru	ACTIVE	0	3	\N	2025-11-26 08:27:36.21	2025-11-26 14:38:14.121	eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImxvZ2luIjpudWxsLCJpYXQiOjE3NjQxNjc4OTQsImV4cCI6MTc2NDc3MjY5NH0.uDK6j3mHycD9UJ8XbOQIUGovvCOYPcNG7Z7oZwygtp4	\N
\.


--
-- Data for Name: UserAchievement; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserAchievement" ("userId", "achievementId", "awardedAt") FROM stdin;
\.


--
-- Data for Name: UserActivity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivity" (id, action, details, "createdAt", "userId", "streamId") FROM stdin;
1	User vitaly.sadikov1@yandex.ru started stream: 'CS 2 Faceit Stream'	\N	2025-11-26 14:45:47.559	\N	\N
\.


--
-- Data for Name: UserActivityParticipants; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserActivityParticipants" ("userId", "activityId", role) FROM stdin;
1	1	initiator
\.


--
-- Data for Name: UserRank; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."UserRank" ("userId", "rankId") FROM stdin;
\.


--
-- Data for Name: _UserFollows; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_UserFollows" ("A", "B") FROM stdin;
\.


--
-- Name: Achievement_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Achievement_id_seq"', 1, true);


--
-- Name: Act_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Act_id_seq"', 2, true);


--
-- Name: Category_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Category_id_seq"', 1, false);


--
-- Name: ChatMessage_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ChatMessage_id_seq"', 1, false);


--
-- Name: Guild_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Guild_id_seq"', 1, false);


--
-- Name: Intro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Intro_id_seq"', 1, true);


--
-- Name: Music_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Music_id_seq"', 3, true);


--
-- Name: Outro_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Outro_id_seq"', 1, true);


--
-- Name: Rank_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Rank_id_seq"', 1, false);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 3, true);


--
-- Name: Sequel_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Sequel_id_seq"', 1, false);


--
-- Name: UserActivity_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."UserActivity_id_seq"', 1, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 2, true);


--
-- Name: Achievement Achievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Achievement"
    ADD CONSTRAINT "Achievement_pkey" PRIMARY KEY (id);


--
-- Name: ActMusic ActMusic_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_pkey" PRIMARY KEY ("actId", "musicId");


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
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Guild Guild_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Guild"
    ADD CONSTRAINT "Guild_pkey" PRIMARY KEY (id);


--
-- Name: Intro Intro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro"
    ADD CONSTRAINT "Intro_pkey" PRIMARY KEY (id);


--
-- Name: Music Music_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music"
    ADD CONSTRAINT "Music_pkey" PRIMARY KEY (id);


--
-- Name: Outro Outro_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro"
    ADD CONSTRAINT "Outro_pkey" PRIMARY KEY (id);


--
-- Name: Rank Rank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Rank"
    ADD CONSTRAINT "Rank_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: Sequel Sequel_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel"
    ADD CONSTRAINT "Sequel_pkey" PRIMARY KEY (id);


--
-- Name: UserAchievement UserAchievement_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("userId", "achievementId");


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
-- Name: UserRank UserRank_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_pkey" PRIMARY KEY ("userId", "rankId");


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
-- Name: Achievement_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Achievement_name_key" ON public."Achievement" USING btree (name);


--
-- Name: ActMusic_actId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ActMusic_actId_idx" ON public."ActMusic" USING btree ("actId");


--
-- Name: Category_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Category_name_key" ON public."Category" USING btree (name);


--
-- Name: ChatMessage_actId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_actId_createdAt_idx" ON public."ChatMessage" USING btree ("actId", "createdAt");


--
-- Name: Guild_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Guild_name_key" ON public."Guild" USING btree (name);


--
-- Name: Rank_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Rank_name_key" ON public."Rank" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: UserAchievement_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserAchievement_userId_idx" ON public."UserAchievement" USING btree ("userId");


--
-- Name: UserRank_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "UserRank_userId_idx" ON public."UserRank" USING btree ("userId");


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
-- Name: ActMusic ActMusic_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ActMusic ActMusic_musicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActMusic"
    ADD CONSTRAINT "ActMusic_musicId_fkey" FOREIGN KEY ("musicId") REFERENCES public."Music"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."Category"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Act Act_introId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_introId_fkey" FOREIGN KEY ("introId") REFERENCES public."Intro"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_outroId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_outroId_fkey" FOREIGN KEY ("outroId") REFERENCES public."Outro"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_sequelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_sequelId_fkey" FOREIGN KEY ("sequelId") REFERENCES public."Sequel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Act Act_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Act"
    ADD CONSTRAINT "Act_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_actId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_actId_fkey" FOREIGN KEY ("actId") REFERENCES public."Act"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Intro Intro_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Intro"
    ADD CONSTRAINT "Intro_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Music Music_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Music"
    ADD CONSTRAINT "Music_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Outro Outro_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Outro"
    ADD CONSTRAINT "Outro_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Sequel Sequel_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Sequel"
    ADD CONSTRAINT "Sequel_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserAchievement UserAchievement_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public."Achievement"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserAchievement UserAchievement_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserAchievement"
    ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: UserRank UserRank_rankId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_rankId_fkey" FOREIGN KEY ("rankId") REFERENCES public."Rank"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserRank UserRank_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."UserRank"
    ADD CONSTRAINT "UserRank_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


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
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--


