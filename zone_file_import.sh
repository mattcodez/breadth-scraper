#!/usr/bin/env bash

if [ -z "$1" ]; then
  echo usage: $0 tsv-path
  exit
fi

#first run: cut -f1 file > justdomain.tsv
#also remove tld entry ex. (guru.)

file=$1;
filepath=$(realpath $file);

psql \
  --username=importer \
  --host=localhost \
  --dbname=breadth <<EOF
\COPY public.domain_staging("domain") FROM '${filepath}';
EOF
