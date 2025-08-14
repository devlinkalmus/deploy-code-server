/**
 * Security Defense - Honeypot Server for suspicious port hits
 * Implements TCP honeypot servers to detect and log malicious network activity
 */

import * as net from 'net';
import * as http from 'http';
import { logger } from '../utils/logging';
import { intrusionLogger } from './security_defense_intrusion-logger';

export interface HoneypotConfig {
  enabled: boolean;
  ports: number[];
  maxConnections: number;
  connectionTimeout: number; // seconds
  logAllConnections: boolean;
  responseDelay: number; // milliseconds
  fakeServices: boolean;
}

export interface HoneypotServer {
  port: number;
  protocol: 'tcp' | 'http';
  service: string;
  server: net.Server | http.Server;
  connections: number;
  started: Date;
}

export interface ConnectionAttempt {
  remoteAddress: string;
  remotePort: number;
  targetPort: number;
  timestamp: Date;
  duration: number;
  dataReceived: string;
  serviceType: string;
}

class SecurityDefenseHoneypotServer {
  private config: HoneypotConfig;
  private honeypotLogger = logger.createChildLogger('honeypot-server');
  private servers: Map<number, HoneypotServer> = new Map();
  private connectionAttempts: ConnectionAttempt[] = [];

  constructor(config: Partial<HoneypotConfig> = {}) {
    this.config = {
      enabled: true,
      ports: [22, 23, 80, 135, 139, 445, 1433, 3306, 3389, 5432, 8080, 9200],
      maxConnections: 100,
      connectionTimeout: 30,
      logAllConnections: true,
      responseDelay: 1000,
      fakeServices: true,
      ...config
    };

    if (this.config.enabled) {
      this.initializeHoneypots();
    }
  }

  /**
   * Initialize honeypot servers on configured ports
   */
  private async initializeHoneypots(): Promise<void> {
    this.honeypotLogger.info('Initializing honeypot servers', 'honeypot-init', {
      ports: this.config.ports,
      maxConnections: this.config.maxConnections
    });

    for (const port of this.config.ports) {
      try {
        await this.createHoneypotServer(port);
      } catch (error) {
        this.honeypotLogger.warn(
          `Failed to create honeypot on port ${port}: ${error instanceof Error ? error.message : String(error)}`,
          'honeypot-init'
        );
      }
    }

    this.honeypotLogger.info(
      `Honeypot servers initialized: ${this.servers.size}/${this.config.ports.length} ports`,
      'honeypot-init'
    );

    // Start cleanup interval
    this.startConnectionCleanup();
  }

  /**
   * Create honeypot server for specific port
   */
  private async createHoneypotServer(port: number): Promise<void> {
    const serviceType = this.getServiceType(port);
    const isHttpService = this.isHttpPort(port);

    try {
      let server: net.Server | http.Server;

      if (isHttpService) {
        server = this.createHttpHoneypot(port);
      } else {
        server = this.createTcpHoneypot(port);
      }

      const honeypotServer: HoneypotServer = {
        port,
        protocol: isHttpService ? 'http' : 'tcp',
        service: serviceType,
        server,
        connections: 0,
        started: new Date()
      };

      // Start the server
      await this.startServer(server, port);
      this.servers.set(port, honeypotServer);

      this.honeypotLogger.info(
        `Honeypot server started on port ${port} (${serviceType})`,
        'honeypot-server',
        { port, service: serviceType, protocol: honeypotServer.protocol }
      );

    } catch (error) {
      throw new Error(`Failed to create honeypot on port ${port}: ${error}`);
    }
  }

  /**
   * Create TCP honeypot server
   */
  private createTcpHoneypot(port: number): net.Server {
    const server = net.createServer();
    const serviceType = this.getServiceType(port);

    server.on('connection', async (socket) => {
      const startTime = new Date();
      const remoteAddress = socket.remoteAddress || 'unknown';
      const remotePort = socket.remotePort || 0;

      try {
        // Log the connection attempt
        await this.logConnectionAttempt(remoteAddress, remotePort, port, serviceType);

        // Track connection
        const honeypotServer = this.servers.get(port);
        if (honeypotServer) {
          honeypotServer.connections++;
        }

        let dataReceived = '';

        // Set connection timeout
        socket.setTimeout(this.config.connectionTimeout * 1000);

        socket.on('data', (data) => {
          dataReceived += data.toString();
          
          // Log data received
          this.honeypotLogger.security(
            `Data received on honeypot port ${port}`,
            'honeypot-data',
            {
              port,
              remoteAddress,
              dataLength: data.length,
              data: data.toString().substring(0, 200) // Log first 200 chars
            }
          );
        });

        socket.on('timeout', () => {
          socket.destroy();
        });

        socket.on('close', async () => {
          const duration = Date.now() - startTime.getTime();
          
          // Record connection attempt details
          this.connectionAttempts.push({
            remoteAddress,
            remotePort,
            targetPort: port,
            timestamp: startTime,
            duration,
            dataReceived: dataReceived.substring(0, 500), // Store first 500 chars
            serviceType
          });

          if (honeypotServer) {
            honeypotServer.connections--;
          }
        });

        socket.on('error', (error) => {
          this.honeypotLogger.warn(
            `Socket error on honeypot port ${port}: ${error.message}`,
            'honeypot-error',
            { port, remoteAddress, error: error.message }
          );
        });

        // Add response delay
        if (this.config.responseDelay > 0) {
          await this.delay(this.config.responseDelay);
        }

        // Send fake service response if enabled
        if (this.config.fakeServices) {
          const response = this.generateServiceResponse(port, serviceType);
          if (response) {
            socket.write(response);
          }
        }

      } catch (error) {
        this.honeypotLogger.error(
          `Error handling honeypot connection: ${error instanceof Error ? error.message : String(error)}`,
          'honeypot-error',
          { port, remoteAddress }
        );
        socket.destroy();
      }
    });

    server.on('error', (error) => {
      this.honeypotLogger.error(
        `TCP honeypot server error on port ${port}: ${error.message}`,
        'honeypot-error',
        { port, error: error.message }
      );
    });

    return server;
  }

  /**
   * Create HTTP honeypot server
   */
  private createHttpHoneypot(port: number): http.Server {
    const server = http.createServer(async (req, res) => {
      const remoteAddress = req.socket.remoteAddress || 'unknown';
      const remotePort = req.socket.remotePort || 0;
      const startTime = new Date();

      try {
        // Log HTTP request attempt
        await this.logConnectionAttempt(remoteAddress, remotePort, port, 'HTTP');

        this.honeypotLogger.security(
          `HTTP request to honeypot port ${port}`,
          'honeypot-http',
          {
            port,
            remoteAddress,
            method: req.method,
            url: req.url,
            headers: req.headers,
            userAgent: req.headers['user-agent']
          },
          {
            tags: ['honeypot-http', 'intrusion-detected']
          }
        );

        // Track connection
        const honeypotServer = this.servers.get(port);
        if (honeypotServer) {
          honeypotServer.connections++;
        }

        // Add response delay
        if (this.config.responseDelay > 0) {
          await this.delay(this.config.responseDelay);
        }

        // Generate fake HTTP response
        const response = this.generateHttpResponse(port, req);
        
        res.writeHead(response.statusCode, response.headers);
        res.end(response.body);

        // Record connection attempt
        this.connectionAttempts.push({
          remoteAddress,
          remotePort,
          targetPort: port,
          timestamp: startTime,
          duration: Date.now() - startTime.getTime(),
          dataReceived: `${req.method} ${req.url}`,
          serviceType: 'HTTP'
        });

        if (honeypotServer) {
          honeypotServer.connections--;
        }

      } catch (error) {
        this.honeypotLogger.error(
          `Error handling HTTP honeypot request: ${error instanceof Error ? error.message : String(error)}`,
          'honeypot-error',
          { port, remoteAddress }
        );
        
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });

    server.on('error', (error) => {
      this.honeypotLogger.error(
        `HTTP honeypot server error on port ${port}: ${error.message}`,
        'honeypot-error',
        { port, error: error.message }
      );
    });

    return server;
  }

  /**
   * Start server and handle port binding
   */
  private startServer(server: net.Server | http.Server, port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      server.listen(port, () => {
        resolve();
      });

      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else if (error.code === 'EACCES') {
          reject(new Error(`Permission denied to bind to port ${port}`));
        } else {
          reject(error);
        }
      });
    });
  }

  /**
   * Log connection attempt to intrusion logger
   */
  private async logConnectionAttempt(
    remoteAddress: string,
    remotePort: number,
    targetPort: number,
    serviceType: string
  ): Promise<void> {
    await intrusionLogger.logHoneypotTrigger(
      remoteAddress,
      `honeypot_${serviceType.toLowerCase()}`,
      {
        targetPort,
        remotePort,
        serviceType,
        timestamp: new Date()
      }
    );
  }

  /**
   * Get service type for port
   */
  private getServiceType(port: number): string {
    const serviceMap: Record<number, string> = {
      22: 'SSH',
      23: 'Telnet',
      80: 'HTTP',
      135: 'RPC',
      139: 'NetBIOS',
      445: 'SMB',
      1433: 'MSSQL',
      3306: 'MySQL',
      3389: 'RDP',
      5432: 'PostgreSQL',
      8080: 'HTTP-Alt',
      9200: 'Elasticsearch'
    };

    return serviceMap[port] || 'Unknown';
  }

  /**
   * Check if port should use HTTP protocol
   */
  private isHttpPort(port: number): boolean {
    return [80, 8080, 8000, 3000, 5000].includes(port);
  }

  /**
   * Generate fake service response
   */
  private generateServiceResponse(port: number, serviceType: string): string | null {
    switch (serviceType) {
      case 'SSH':
        return 'SSH-2.0-OpenSSH_8.2p1 Ubuntu-4ubuntu0.5\r\n';
      
      case 'Telnet':
        return 'Welcome to Ubuntu 20.04.3 LTS\r\nlogin: ';
      
      case 'HTTP':
        return 'HTTP/1.1 200 OK\r\nServer: nginx/1.18.0\r\nContent-Type: text/html\r\n\r\n<html><head><title>Index</title></head><body><h1>It works!</h1></body></html>';
      
      case 'MSSQL':
        return '\x04\x01\x00\x25\x00\x00\x01\x00\x00\x00\x15\x00\x06\x01\x00\x1b\x00\x01\x02\x00\x1c\x00\x0c\x03\x00\x28\x00\x04\xff\x08\x00\x01\x55\x00\x00\x00\x4d\x53\x53\x51\x4c\x53\x65\x72\x76\x65\x72\x00\x48\x0f\x00\x00';
      
      case 'MySQL':
        return '\x0a5.7.34-0ubuntu0.18.04.1\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00';
      
      default:
        return null;
    }
  }

  /**
   * Generate fake HTTP response
   */
  private generateHttpResponse(port: number, req: http.IncomingMessage): {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  } {
    const baseHeaders = {
      'Server': 'nginx/1.18.0 (Ubuntu)',
      'Content-Type': 'text/html; charset=UTF-8',
      'X-Powered-By': 'PHP/7.4.3'
    };

    // Different responses based on request
    if (req.url?.includes('admin') || req.url?.includes('login')) {
      return {
        statusCode: 200,
        headers: baseHeaders,
        body: `
          <!DOCTYPE html>
          <html>
          <head><title>Admin Login</title></head>
          <body>
            <h1>Administrator Login</h1>
            <form method="post">
              <input type="text" name="username" placeholder="Username" required>
              <input type="password" name="password" placeholder="Password" required>
              <button type="submit">Login</button>
            </form>
          </body>
          </html>
        `
      };
    }

    if (req.url?.includes('api')) {
      return {
        statusCode: 401,
        headers: { ...baseHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Unauthorized',
          message: 'API key required',
          code: 401
        })
      };
    }

    // Default response
    return {
      statusCode: 200,
      headers: baseHeaders,
      body: `
        <!DOCTYPE html>
        <html>
        <head><title>Welcome</title></head>
        <body>
          <h1>Welcome to our server</h1>
          <p>Server running on port ${port}</p>
          <p>Current time: ${new Date().toISOString()}</p>
        </body>
        </html>
      `
    };
  }

  /**
   * Get honeypot statistics
   */
  getHoneypotStats(): {
    totalServers: number;
    activeServers: number;
    totalConnections: number;
    recentConnections: number;
    topTargetPorts: Array<{ port: number; count: number; service: string }>;
    topSources: Array<{ ip: string; count: number; lastSeen: Date }>;
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentConnections = this.connectionAttempts.filter(
      attempt => attempt.timestamp >= oneHourAgo
    );

    // Top target ports
    const portCounts = new Map<number, number>();
    this.connectionAttempts.forEach(attempt => {
      portCounts.set(attempt.targetPort, (portCounts.get(attempt.targetPort) || 0) + 1);
    });

    const topTargetPorts = Array.from(portCounts.entries())
      .map(([port, count]) => ({
        port,
        count,
        service: this.getServiceType(port)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top source IPs
    const sourceCounts = new Map<string, { count: number; lastSeen: Date }>();
    this.connectionAttempts.forEach(attempt => {
      const existing = sourceCounts.get(attempt.remoteAddress);
      if (existing) {
        existing.count++;
        if (attempt.timestamp > existing.lastSeen) {
          existing.lastSeen = attempt.timestamp;
        }
      } else {
        sourceCounts.set(attempt.remoteAddress, {
          count: 1,
          lastSeen: attempt.timestamp
        });
      }
    });

    const topSources = Array.from(sourceCounts.entries())
      .map(([ip, data]) => ({ ip, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalServers: this.servers.size,
      activeServers: Array.from(this.servers.values()).filter(s => s.connections > 0).length,
      totalConnections: this.connectionAttempts.length,
      recentConnections: recentConnections.length,
      topTargetPorts,
      topSources
    };
  }

  /**
   * Get recent connection attempts
   */
  getRecentConnections(limit: number = 50): ConnectionAttempt[] {
    return this.connectionAttempts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Start connection cleanup interval
   */
  private startConnectionCleanup(): void {
    setInterval(() => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const beforeCount = this.connectionAttempts.length;
      
      this.connectionAttempts = this.connectionAttempts.filter(
        attempt => attempt.timestamp >= oneDayAgo
      );

      if (beforeCount !== this.connectionAttempts.length) {
        this.honeypotLogger.info(
          `Cleaned up ${beforeCount - this.connectionAttempts.length} old connection records`,
          'honeypot-cleanup'
        );
      }
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add honeypot port
   */
  async addHoneypotPort(port: number): Promise<boolean> {
    if (this.servers.has(port)) {
      return false;
    }

    try {
      await this.createHoneypotServer(port);
      this.config.ports.push(port);
      return true;
    } catch (error) {
      this.honeypotLogger.error(
        `Failed to add honeypot port ${port}: ${error instanceof Error ? error.message : String(error)}`,
        'honeypot-config'
      );
      return false;
    }
  }

  /**
   * Remove honeypot port
   */
  removeHoneypotPort(port: number): boolean {
    const server = this.servers.get(port);
    if (!server) {
      return false;
    }

    server.server.close();
    this.servers.delete(port);
    this.config.ports = this.config.ports.filter(p => p !== port);

    this.honeypotLogger.info(`Removed honeypot server on port ${port}`, 'honeypot-config');
    return true;
  }

  /**
   * Shutdown all honeypot servers
   */
  async shutdown(): Promise<void> {
    this.honeypotLogger.info('Shutting down honeypot servers', 'honeypot-shutdown');

    for (const [port, server] of this.servers.entries()) {
      try {
        server.server.close();
        this.honeypotLogger.info(`Closed honeypot server on port ${port}`, 'honeypot-shutdown');
      } catch (error) {
        this.honeypotLogger.error(
          `Error closing honeypot server on port ${port}: ${error instanceof Error ? error.message : String(error)}`,
          'honeypot-shutdown'
        );
      }
    }

    this.servers.clear();
    this.honeypotLogger.info('All honeypot servers shut down', 'honeypot-shutdown');
  }
}

// Singleton instance
export const securityDefenseHoneypotServer = new SecurityDefenseHoneypotServer();

export default securityDefenseHoneypotServer;