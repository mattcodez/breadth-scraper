#sudo -u postgres psql
#

CREATE DATABASE breadth;


SET SCHEMA 'public';

CREATE TABLE domain_staging (
  "id"      SERIAL PRIMARY KEY,
  "domain"  VARCHAR(259)
);
--GRANT ALL ON domain_staging TO "importer";

CREATE TABLE domains (
  "id"      SERIAL PRIMARY KEY,
  "domain"  VARCHAR(259) UNIQUE NOT NULL
);

-- We may try different URL's for a single domain
-- Well, beyond that, most domains have tons of pages
CREATE TABLE pages (
  "id"      SERIAL PRIMARY KEY,
  "domain"  INT REFERENCES "domains",
  "url"     TEXT UNIQUE --this could be really bad for performance
);

CREATE TABLE pages_captures(
  "id"            SERIAL PRIMARY KEY,
  "page"          INT REFERENCES "pages" NOT NULL,
  "response_code" INT,
  "body"          TEXT,
  "created_at"    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX pages_body_idx ON pages_captures USING GIN (to_tsvector('english', "body"));

CREATE OR REPLACE FUNCTION add_domains_from_staging(OUT insertcount int)
RETURNS int AS $$
BEGIN
  INSERT INTO domains(domain)
  SELECT
    TRIM(TRAILING '.' FROM domain) AS domain
  FROM domain_staging
  ON CONFLICT DO NOTHING;
  GET DIAGNOSTICS insertcount = ROW_COUNT;
END;
$$ LANGUAGE plpgsql;
