.PHONY: all clean

all: crypto/client_key.pem crypto/server.pfx

crypto/client_key.pem: crypto
	openssl genrsa -out crypto/client_key.pem 1024

crypto/server_key.pem: crypto
	openssl genrsa -out crypto/server_key.pem 1024

crypto/server_csr.pem: crypto/server_key.pem
	openssl req -subj '/CN=localhost/C=US' -new -key crypto/server_key.pem -out crypto/server_csr.pem

crypto/server_cert.pem: crypto/server_csr.pem crypto/server_key.pem
	openssl x509 -req -in crypto/server_csr.pem -signkey crypto/server_key.pem -out crypto/server_cert.pem

crypto/server.pfx: crypto/server_cert.pem crypto/server_key.pem
	openssl pkcs12 -export -password 'pass:' -in crypto/server_cert.pem -inkey crypto/server_key.pem -out crypto/server.pfx

crypto:
	mkdir -p crypto

clean:
	rm -rf crypto
