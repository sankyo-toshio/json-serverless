import fs from 'fs-extra';
import { Command, flags } from '@oclif/command';
import Listr = require('listr');
import * as path from 'path';
import { Helpers } from '../actions/helpers';
import { AWSActions } from '../actions/aws-actions';
import chalk from 'chalk';
import cli from 'cli-ux';
import { AppConfig, LogLevel } from 'json-serverless-lib';

export class UpdateStackCommand extends Command {
  static description =
    'update the stackfolder and update the stack in the cloud';

  static flags = {
    help: flags.help({ char: 'h' }),
    // flag with no value (-f, --force)
    readonly: flags.boolean({
      char: 'r', // shorter flag version
      description: 'set api to readonly (true) or writeable (false)', // help description for flag
      hidden: false, // hide from help
      default: false, // default value if flag not passed (can be a function that returns a string or undefined)
      required: false, // default value if flag not passed (can be a function that returns a string or undefined)
    }),
    swagger: flags.boolean({
      char: 's', // shorter flag version
      description: 'enable or disable swagger interface support', // help description for flag
      hidden: false, // hide from help
      default: true, // default value if flag not passed (can be a function that returns a string or undefined)
      required: false, // make flag required (this is not common and you should probably use an argument instead)
      allowNo: true,
    }),
    apikeyauth: flags.boolean({
      char: 'a', // shorter flag version
      description: 'require api key authentication to access api', // help description for flag
      hidden: false, // hide from help
      default: false, // default value if flag not passed (can be a function that returns a string or undefined)
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    currentdirectory: flags.string({
      char: 'p', // shorter flag version
      description: 'current working directory that will be used for execution', // help description for flag
      hidden: false, // hide from help
      default: '', // default value if flag not passed (can be a function that returns a string or undefined)
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    loglevel: flags.string({
      char: 'l', // shorter flag version
      description: 'loglevel of outputs', // help description for flag
      hidden: false, // hide from help
      default: 'info',
      options: ['info', 'debug'], // default value if flag not passed (can be a function that returns a string or undefined)
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    apiRoute: flags.string({
      description: 'path to use for api route', // help description for flag
      hidden: false, // hide from help
      default: '/api',
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    graphqlRoute: flags.string({
      description: 'path for the graphql interface', // help description for flag
      hidden: false, // hide from help
      default: '/graphql',
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    apispecRoute: flags.string({
      description: 'path for the swagger / open api specification', // help description for flag
      hidden: false, // hide from help
      default: '/api-spec',
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
    swaggeruiRoute: flags.string({
      description: 'path for the swagger ui interface', // help description for flag
      hidden: false, // hide from help
      default: '/ui',
      required: false, // make flag required (this is not common and you should probably use an argument instead)
    }),
  };

  async run() {
    const logo = await Helpers.generateLogo('json-serverless');
    this.log();
    this.log(`${chalk.blueBright(logo)}`);
    this.log();
    const { flags } = this.parse(UpdateStackCommand);

    if (flags.currentdirectory) {
      Helpers.changeDirectory(flags.currentdirectory);
    }

    cli.action.start(
      `${chalk.blueBright('Check AWS Identity')}`,
      `${chalk.blueBright('initializing')}`,
      { stdout: true }
    );
    try {
      const identity = await AWSActions.checkValidAWSIdentity();
      this.log(`${chalk.green('AWS Account: ' + identity.Account)}`);
    } catch (error) {
      this.error(`${chalk.red(error.message)}`);
    }
    cli.action.stop();
    this.log();

    const templateFolder = path.normalize(
      this.config.root + '/node_modules/json-serverless-template/'
    );
    const stackFolder = process.cwd();
    const tasks = new Listr([
      {
        title: 'Validate JSON Serverless Directory',
        task: (task) => {
          Helpers.isJSONServerlessDirectory(stackFolder);
        },
      },
      {
        title: 'Copy Template Files',
        task: async (task) => {
          if (process.env.NODE_ENV === 'local') {
            await fs.copy(
              templateFolder + '/node_modules',
              stackFolder + '/node_modules'
            );
          }
          await fs.copy(templateFolder + '/src', stackFolder + '/src');
          await fs.copy(
            templateFolder + '/package.json',
            stackFolder + '/package.json'
          );
          await fs.copy(
            templateFolder + '/package-lock.json',
            stackFolder + '/package-lock.json'
          );
          await fs.copy(
            templateFolder + '/serverless.yml',
            stackFolder + '/serverless.yml'
          );
          await fs.copy(
            templateFolder + '/tsconfig.json',
            stackFolder + '/tsconfig.json'
          );
          await fs.copy(
            templateFolder + '/webpack.config.js',
            stackFolder + '/webpack.config.js'
          );
        },
      },
      {
        title: 'Update Appconfig',
        task: (ctx, task) => {
          const appConfig: AppConfig = JSON.parse(
            fs.readFileSync(stackFolder + '/config/appconfig.json', 'UTF-8')
          );
          appConfig.enableApiKeyAuth = flags.apikeyauth;
          appConfig.readOnly = flags.readonly;
          appConfig.enableSwagger = flags.swagger;
          appConfig.logLevel = flags.loglevel as LogLevel;
          appConfig.routes.apiRoutePath = flags.apiRoute;
          appConfig.routes.graphqlRoutePath = flags.graphqlRoute;
          appConfig.routes.swaggerSpecRoutePath = flags.apispecRoute;
          appConfig.routes.swaggerUIRoutePath = flags.swaggeruiRoute;

          fs.writeFileSync(
            path.normalize(stackFolder + '/config/appconfig.json'),
            JSON.stringify(appConfig, null, 2),
            'utf-8'
          );
        },
      },
      {
        title: 'Update Dependencies',
        task: async (task) => {
          if (process.env.NODE_ENV != 'local') {
            task.output = 'INSTALL DEPENDENCIES';
            Helpers.removeDir(stackFolder + '/node_modules');
            await Helpers.executeChildProcess(
              'npm i',
              {
                cwd: stackFolder,
              },
              false
            );
          }
        },
      },
      {
        title: 'Build Code',
        task: async () => {
          await Helpers.executeChildProcess(
            'npm run build',
            {
              cwd: stackFolder,
            },
            false
          );
        },
      },
      {
        title: 'Deploy Stack on AWS',
        task: async () => {
          await Helpers.executeChildProcess(
            'node_modules/serverless/bin/serverless deploy',
            {
              cwd: stackFolder,
            },
            false
          );
        },
      },
    ]);
    let slsinfo = '';
    try {
      await tasks.run();
      slsinfo = await Helpers.executeChildProcess2(
        'node_modules/serverless/bin/serverless info',
        { cwd: stackFolder }
      );
    } catch (error) {
      this.error(`${chalk.red(error.message)}`);
    }
    try {
      const appConfig = JSON.parse(
        fs.readFileSync(stackFolder + '/config/appconfig.json', 'UTF-8')
      ) as AppConfig;

      Helpers.createCLIOutput(slsinfo, appConfig);
    } catch (error) {
      this.log(`${chalk.red(error.message)}`);
      this.log(slsinfo);
    }
  }
}
