#!/bin/bash

# Hotel Management System Deployment Script for Ubuntu 25.04
# This script sets up all necessary dependencies and configurations

echo "🏨 Setting up Hotel Management System for Ubuntu 25.04..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3.11 and pip
echo "🐍 Installing Python 3.11..."
sudo apt install -y python3.11 python3.11-pip python3.11-venv python3.11-dev

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Yarn
echo "📦 Installing Yarn..."
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
sudo apt update && sudo apt install -y yarn

# Install MongoDB
echo "🗄️ Installing MongoDB..."
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start and enable MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Install Supervisor for process management
echo "🔧 Installing Supervisor..."
sudo apt install -y supervisor

# Install build essentials for Python packages
echo "🛠️ Installing build essentials..."
sudo apt install -y build-essential libssl-dev libffi-dev python3.11-dev

# Install additional system dependencies
echo "📦 Installing additional dependencies..."
sudo apt install -y curl wget git vim nano htop

# Install Python packages globally (for system-wide availability)
echo "🐍 Installing Python packages..."
pip3.11 install --upgrade pip
pip3.11 install virtualenv

# Create project directory
echo "📁 Creating project directory..."
sudo mkdir -p /opt/hotel-management
sudo chown -R $USER:$USER /opt/hotel-management

# Create virtual environment
echo "🔧 Creating virtual environment..."
cd /opt/hotel-management
python3.11 -m venv venv
source venv/bin/activate

# Install Python requirements
echo "📦 Installing Python requirements..."
pip install --upgrade pip
pip install fastapi==0.110.1
pip install uvicorn==0.25.0
pip install motor==3.3.1
pip install pymongo==4.5.0
pip install pydantic>=2.6.4
pip install python-dotenv>=1.0.1
pip install bcrypt>=4.3.0
pip install pyjwt>=2.10.1
pip install python-multipart>=0.0.9
pip install email-validator>=2.2.0
pip install passlib>=1.7.4
pip install python-jose>=3.3.0
pip install requests>=2.31.0
pip install cryptography>=42.0.8

# Create systemd service file for backend
echo "⚙️ Creating systemd service files..."
sudo tee /etc/systemd/system/hotel-backend.service > /dev/null <<EOF
[Unit]
Description=Hotel Management System Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/hotel-management/backend
Environment=PATH=/opt/hotel-management/venv/bin
ExecStart=/opt/hotel-management/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create systemd service file for frontend
sudo tee /etc/systemd/system/hotel-frontend.service > /dev/null <<EOF
[Unit]
Description=Hotel Management System Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/hotel-management/frontend
ExecStart=/usr/bin/yarn start
Environment=NODE_ENV=production
Environment=PORT=3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create nginx configuration
echo "🌐 Installing and configuring Nginx..."
sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/hotel-management > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/hotel-management /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Create log directories
sudo mkdir -p /var/log/hotel-management
sudo chown -R $USER:$USER /var/log/hotel-management

# Create MongoDB database and user
echo "🗄️ Setting up MongoDB database..."
mongo --eval "
use hotel_management_db;
db.createUser({
  user: 'hotel_admin',
  pwd: 'hotel_password_2024',
  roles: ['readWrite']
});
"

# Create environment files
echo "📝 Creating environment files..."
mkdir -p /opt/hotel-management/backend
mkdir -p /opt/hotel-management/frontend

cat > /opt/hotel-management/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017
DB_NAME=hotel_management_db
JWT_SECRET=hotel-management-secret-key-2024
EOF

cat > /opt/hotel-management/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://localhost
EOF

# Create start script
cat > /opt/hotel-management/start.sh << 'EOF'
#!/bin/bash
cd /opt/hotel-management

# Start MongoDB
sudo systemctl start mongod

# Start backend
sudo systemctl start hotel-backend

# Start frontend
cd frontend && yarn install && yarn build
sudo systemctl start hotel-frontend

# Start nginx
sudo systemctl start nginx

echo "🏨 Hotel Management System started successfully!"
echo "Frontend: http://localhost"
echo "Backend API: http://localhost/api"
EOF

chmod +x /opt/hotel-management/start.sh

# Create stop script
cat > /opt/hotel-management/stop.sh << 'EOF'
#!/bin/bash
sudo systemctl stop hotel-frontend
sudo systemctl stop hotel-backend
sudo systemctl stop nginx
echo "🏨 Hotel Management System stopped!"
EOF

chmod +x /opt/hotel-management/stop.sh

# Enable services
sudo systemctl daemon-reload
sudo systemctl enable mongod
sudo systemctl enable nginx

echo "✅ Hotel Management System setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your application files to /opt/hotel-management/"
echo "2. Install frontend dependencies: cd /opt/hotel-management/frontend && yarn install"
echo "3. Start the system: /opt/hotel-management/start.sh"
echo ""
echo "🌐 Access your application at: http://localhost"
echo "🔧 Admin credentials: admin / admin123"
echo ""
echo "📝 Important files:"
echo "   - Backend: /opt/hotel-management/backend/"
echo "   - Frontend: /opt/hotel-management/frontend/"
echo "   - Logs: /var/log/hotel-management/"
echo "   - Start: /opt/hotel-management/start.sh"
echo "   - Stop: /opt/hotel-management/stop.sh"