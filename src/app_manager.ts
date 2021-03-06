import App from "./app";
import InstallRequest from "./install";

const api_obniz_io = `https://api.obniz.io`;
const WebAppToken: string = process.env.TOKEN!;

export default class AppManager {
  private installs: any = [];
  private apps: App[] = [];

  constructor() {}

  public async start() {
    // Getting All Installs
    while (true) {
      const result = await InstallRequest(api_obniz_io, WebAppToken, this.installs.length);
      console.log(result);
      for (const edge of result.webapp.installs.edges) {
        const node = edge.node;
        this.installs.push(node);
      }
      if (!result.webapp.installs.pageInfo.hasNextPage) {
        break;
      }
    }
    console.log(`Install app number=${this.installs.length}`);
    // start all apps
    for (const install of this.installs) {
      await this.startApp(install);
    }
  }

  public async webhooked(obj: any) {
    const install = obj.data;
    if (obj.type === "install.create") {
      this.startApp(install);
    } else if (obj.type === "install.update") {
      this.stopApp(install);
      this.startApp(install);
    } else if (obj.type === "install.delete") {
      this.stopApp(install);
    }
  }

  public async startApp(install: any) {
    const app = new App(install);
    this.apps.push(app);
    await app.start();
    looping(app).then(() => {
      // finished looping
    });
  }

  public async stopApp(install: any) {
    for (const app of this.apps) {
      if (app.id === install.id) {
        this.apps.splice(this.apps.indexOf(app), 1);
        await app.stop();
        return;
      }
    }
    console.log(`not found install ${install.id}`);
  }
}

async function looping(app: App) {
  while (app.state === "starting" || app.state === "started") {
    try {
      await app.loop();
    } catch (e) {
      console.error(e);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
  }
}
