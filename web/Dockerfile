FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html open.html robots.txt og.jpg favicon.png apple-touch-icon.png /usr/share/nginx/html/
COPY .well-known /usr/share/nginx/html/.well-known
EXPOSE 80
