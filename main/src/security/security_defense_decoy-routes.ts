/**
 * Security Defense - Decoy Routes for Intrusion Detection
 * Implements fake endpoints to detect reconnaissance and attack attempts
 */

import { Request, Response, NextFunction } from 'express';
import { intrusionLogger } from './security_defense_intrusion-logger';
import { logger } from '../utils/logging';

export interface DecoyRouteConfig {
  enabled: boolean;
  responseDelay: number; // milliseconds
  logAllAccess: boolean;
  honeypotResponses: boolean;
  realisticResponses: boolean;
}

export interface DecoyRoute {
  path: string;
  methods: string[];
  description: string;
  responseType: 'empty' | 'error' | 'fake_data' | 'redirect' | 'honeypot';
  suspicionLevel: 'low' | 'medium' | 'high';
  payload?: any;
}

class SecurityDefenseDecoyRoutes {
  private config: DecoyRouteConfig;
  private decoyLogger = logger.createChildLogger('decoy-routes');
  private decoyRoutes: DecoyRoute[] = [];

  constructor(config: Partial<DecoyRouteConfig> = {}) {
    this.config = {
      enabled: true,
      responseDelay: 500,
      logAllAccess: true,
      honeypotResponses: true,
      realisticResponses: true,
      ...config
    };

    this.initializeDecoyRoutes();
  }

  /**
   * Initialize common decoy routes
   */
  private initializeDecoyRoutes(): void {
    this.decoyRoutes = [
      // Admin panel decoys
      {
        path: '/admin',
        methods: ['GET', 'POST'],
        description: 'Fake admin panel',
        responseType: 'fake_data',
        suspicionLevel: 'high',
        payload: {
          title: 'Admin Panel',
          loginForm: true,
          message: 'Please log in to continue'
        }
      },
      {
        path: '/administrator',
        methods: ['GET', 'POST'],
        description: 'Alternative admin panel',
        responseType: 'fake_data',
        suspicionLevel: 'high'
      },
      {
        path: '/wp-admin',
        methods: ['GET', 'POST'],
        description: 'WordPress admin decoy',
        responseType: 'fake_data',
        suspicionLevel: 'high',
        payload: {
          error: 'WordPress not found',
          redirect: '/login'
        }
      },

      // API endpoint decoys
      {
        path: '/api/admin',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Admin API endpoint',
        responseType: 'error',
        suspicionLevel: 'high'
      },
      {
        path: '/api/users',
        methods: ['GET', 'POST'],
        description: 'User management API',
        responseType: 'fake_data',
        suspicionLevel: 'medium',
        payload: {
          users: [
            { id: 1, username: 'admin', role: 'administrator' },
            { id: 2, username: 'user', role: 'user' }
          ]
        }
      },
      {
        path: '/api/config',
        methods: ['GET'],
        description: 'Configuration API',
        responseType: 'fake_data',
        suspicionLevel: 'high',
        payload: {
          database: { host: 'localhost', name: 'app_db' },
          redis: { host: 'redis-server', port: 6379 },
          secrets: { encrypted: true, location: '/vault/secrets' }
        }
      },

      // Database decoys
      {
        path: '/phpmyadmin',
        methods: ['GET', 'POST'],
        description: 'phpMyAdmin interface',
        responseType: 'fake_data',
        suspicionLevel: 'high',
        payload: {
          title: 'phpMyAdmin',
          version: '5.1.1',
          server: 'MySQL 8.0.28'
        }
      },
      {
        path: '/adminer',
        methods: ['GET', 'POST'],
        description: 'Adminer database tool',
        responseType: 'fake_data',
        suspicionLevel: 'high'
      },

      // File system decoys
      {
        path: '/.env',
        methods: ['GET'],
        description: 'Environment file',
        responseType: 'fake_data',
        suspicionLevel: 'high',
        payload: {
          content: `
APP_NAME=ProductionApp
APP_ENV=production
APP_DEBUG=false
DB_HOST=localhost
DB_DATABASE=prod_db
DB_USERNAME=user
DB_PASSWORD=hidden_password_123
REDIS_HOST=127.0.0.1
MAIL_MAILER=smtp
MAIL_HOST=mail.server.com
`
        }
      },
      {
        path: '/config.php',
        methods: ['GET'],
        description: 'PHP configuration file',
        responseType: 'fake_data',
        suspicionLevel: 'high'
      },
      {
        path: '/backup',
        methods: ['GET'],
        description: 'Backup directory',
        responseType: 'fake_data',
        suspicionLevel: 'medium',
        payload: {
          files: [
            'database_backup_2024.sql',
            'app_backup_latest.tar.gz',
            'user_data_export.csv'
          ]
        }
      },

      // Security testing decoys
      {
        path: '/test',
        methods: ['GET', 'POST'],
        description: 'Test endpoint',
        responseType: 'fake_data',
        suspicionLevel: 'low'
      },
      {
        path: '/debug',
        methods: ['GET'],
        description: 'Debug information',
        responseType: 'fake_data',
        suspicionLevel: 'medium',
        payload: {
          debug: true,
          version: '1.0.0',
          environment: 'production',
          database_connected: true,
          cache_enabled: true
        }
      },

      // Common attack vectors
      {
        path: '/xmlrpc.php',
        methods: ['POST'],
        description: 'WordPress XML-RPC endpoint',
        responseType: 'error',
        suspicionLevel: 'high'
      },
      {
        path: '/wp-config.php',
        methods: ['GET'],
        description: 'WordPress configuration',
        responseType: 'error',
        suspicionLevel: 'high'
      },
      {
        path: '/shell',
        methods: ['GET', 'POST'],
        description: 'Web shell access',
        responseType: 'honeypot',
        suspicionLevel: 'high'
      }
    ];

    this.decoyLogger.info(`Initialized ${this.decoyRoutes.length} decoy routes`, 'decoy-init');
  }

  /**
   * Get Express middleware for decoy routes
   */
  getDecoyMiddleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      if (!this.config.enabled) {
        return next();
      }

      const matchingRoute = this.findMatchingDecoyRoute(req.path, req.method);
      if (matchingRoute) {
        return this.handleDecoyRequest(req, res, matchingRoute);
      }

      return next();
    };
  }

  /**
   * Find matching decoy route
   */
  private findMatchingDecoyRoute(path: string, method: string): DecoyRoute | null {
    return this.decoyRoutes.find(route => 
      this.pathMatches(route.path, path) && 
      route.methods.includes(method.toUpperCase())
    ) || null;
  }

  /**
   * Check if path matches decoy route pattern
   */
  private pathMatches(routePath: string, requestPath: string): boolean {
    // Exact match
    if (routePath === requestPath) return true;
    
    // Case insensitive match
    if (routePath.toLowerCase() === requestPath.toLowerCase()) return true;
    
    // With or without trailing slash
    const normalizedRoute = routePath.replace(/\/$/, '');
    const normalizedRequest = requestPath.replace(/\/$/, '');
    if (normalizedRoute === normalizedRequest) return true;
    
    return false;
  }

  /**
   * Handle decoy route request
   */
  private async handleDecoyRequest(req: Request, res: Response, route: DecoyRoute): Promise<void> {
    try {
      const clientIp = this.getClientIp(req);
      const userAgent = req.get('User-Agent') || 'Unknown';

      // Log the intrusion attempt
      await intrusionLogger.logDecoyAccess(
        clientIp,
        req.path,
        req.method,
        userAgent
      );

      // Additional logging
      this.decoyLogger.security(
        `Decoy route accessed: ${req.method} ${req.path}`,
        'decoy-access',
        {
          ip: clientIp,
          userAgent,
          route: route.description,
          suspicionLevel: route.suspicionLevel,
          headers: req.headers,
          query: req.query,
          body: req.body
        },
        {
          tags: ['decoy-access', `suspicion-${route.suspicionLevel}`, 'intrusion-detected']
        }
      );

      // Add response delay to slow down attackers
      if (this.config.responseDelay > 0) {
        await this.delay(this.config.responseDelay);
      }

      // Generate appropriate response
      await this.generateDecoyResponse(req, res, route);

    } catch (error) {
      this.decoyLogger.error(
        `Error handling decoy request: ${error instanceof Error ? error.message : String(error)}`,
        'decoy-error',
        { path: req.path, method: req.method }
      );

      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * Generate decoy response based on route configuration
   */
  private async generateDecoyResponse(req: Request, res: Response, route: DecoyRoute): Promise<void> {
    switch (route.responseType) {
      case 'empty':
        res.status(204).send();
        break;

      case 'error':
        res.status(404).json({
          error: 'Not Found',
          message: 'The requested resource was not found',
          timestamp: new Date().toISOString()
        });
        break;

      case 'fake_data':
        if (route.payload) {
          res.status(200).json(route.payload);
        } else {
          res.status(200).json(this.generateGenericFakeData(route));
        }
        break;

      case 'redirect':
        res.redirect(302, '/login');
        break;

      case 'honeypot':
        await this.generateHoneypotResponse(req, res, route);
        break;

      default:
        res.status(404).json({ error: 'Not Found' });
    }
  }

  /**
   * Generate honeypot response to capture more attacker information
   */
  private async generateHoneypotResponse(req: Request, res: Response, route: DecoyRoute): Promise<void> {
    if (!this.config.honeypotResponses) {
      res.status(404).json({ error: 'Not Found' });
      return;
    }

    // Log honeypot trigger
    await intrusionLogger.logHoneypotTrigger(
      this.getClientIp(req),
      'decoy_route',
      {
        path: req.path,
        method: req.method,
        headers: req.headers,
        query: req.query,
        body: req.body
      },
      req.get('User-Agent')
    );

    // Respond with fake shell or admin interface
    if (route.path.includes('shell')) {
      res.set('Content-Type', 'text/html');
      res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Shell Access</title>
          <style>
            body { background: #000; color: #0f0; font-family: monospace; padding: 20px; }
            input { background: #000; color: #0f0; border: 1px solid #0f0; width: 100%; }
          </style>
        </head>
        <body>
          <h1>Remote Shell Access</h1>
          <p>Connected to: ${req.hostname}</p>
          <p>User: root@${req.hostname}</p>
          <form action="${req.path}" method="post">
            <p>$ <input type="text" name="command" placeholder="Enter command..." /></p>
          </form>
          <div id="output">
            <p>Last login: ${new Date().toDateString()}</p>
            <p>Welcome to the honeypot terminal.</p>
          </div>
        </body>
        </html>
      `);
    } else {
      // Generic honeypot response
      res.status(200).json({
        status: 'success',
        message: 'Access granted',
        session: 'fake-session-' + Date.now(),
        permissions: ['read', 'write', 'admin'],
        nextStep: '/api/execute'
      });
    }
  }

  /**
   * Generate generic fake data for routes without specific payload
   */
  private generateGenericFakeData(route: DecoyRoute): any {
    const baseData = {
      status: 'success',
      timestamp: new Date().toISOString(),
      server: 'nginx/1.18.0',
      powered_by: 'Express.js'
    };

    if (route.path.includes('admin')) {
      return {
        ...baseData,
        admin_panel: true,
        version: '2.1.0',
        users_online: 5,
        last_backup: '2024-01-15T10:30:00Z'
      };
    }

    if (route.path.includes('api')) {
      return {
        ...baseData,
        api_version: 'v1.0',
        endpoints: ['/users', '/config', '/status'],
        rate_limit: '1000/hour'
      };
    }

    if (route.path.includes('config')) {
      return {
        ...baseData,
        app_name: 'ProductionApp',
        environment: 'production',
        debug: false,
        database: { connected: true, name: 'main_db' }
      };
    }

    return baseData;
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: Request): string {
    return (
      req.headers['x-forwarded-for'] as string ||
      req.headers['x-real-ip'] as string ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Delay helper function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Add custom decoy route
   */
  addDecoyRoute(route: DecoyRoute): void {
    this.decoyRoutes.push(route);
    this.decoyLogger.info(`Added custom decoy route: ${route.path}`, 'decoy-config');
  }

  /**
   * Remove decoy route
   */
  removeDecoyRoute(path: string): boolean {
    const index = this.decoyRoutes.findIndex(route => route.path === path);
    if (index !== -1) {
      this.decoyRoutes.splice(index, 1);
      this.decoyLogger.info(`Removed decoy route: ${path}`, 'decoy-config');
      return true;
    }
    return false;
  }

  /**
   * Get all decoy routes
   */
  getDecoyRoutes(): DecoyRoute[] {
    return [...this.decoyRoutes];
  }

  /**
   * Get decoy statistics
   */
  getDecoyStats(): {
    totalRoutes: number;
    enabledRoutes: number;
    suspicionLevels: Record<string, number>;
    responseTypes: Record<string, number>;
  } {
    const stats = {
      totalRoutes: this.decoyRoutes.length,
      enabledRoutes: this.config.enabled ? this.decoyRoutes.length : 0,
      suspicionLevels: { low: 0, medium: 0, high: 0 },
      responseTypes: { empty: 0, error: 0, fake_data: 0, redirect: 0, honeypot: 0 }
    };

    this.decoyRoutes.forEach(route => {
      stats.suspicionLevels[route.suspicionLevel]++;
      stats.responseTypes[route.responseType]++;
    });

    return stats;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DecoyRouteConfig>): void {
    this.config = { ...this.config, ...config };
    this.decoyLogger.info('Decoy route configuration updated', 'decoy-config', { config: this.config });
  }

  /**
   * Enable/disable decoy routes
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    this.decoyLogger.info(`Decoy routes ${enabled ? 'enabled' : 'disabled'}`, 'decoy-config');
  }
}

// Singleton instance
export const securityDefenseDecoyRoutes = new SecurityDefenseDecoyRoutes();

export default securityDefenseDecoyRoutes;