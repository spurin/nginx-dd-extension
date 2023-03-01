import {
    Box,
    Button,
    FormControl,
    Grid, IconButton,
    InputLabel,
    MenuItem,
    Select,
    SelectChangeEvent, Slide, Tooltip,
    Typography
} from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import PublishIcon from "@mui/icons-material/Publish";
import UndoIcon from "@mui/icons-material/Undo";
import Editor from "react-simple-code-editor";
import {highlight, languages} from "prismjs";
import "./prism-nginx.css";
import "../prism/prism-nginx.js";
import React, {useEffect, useState} from "react";
import {InstancesService} from "../instances/InstancesService";
import {Add} from "@mui/icons-material";
import {Server} from "../configurationUI/Server";
import {NewConfigurationFile} from "./NewConfigurationFile";

interface ConfigurationEditorProps {
    nginxInstance: any

}

let instanceService: InstancesService = new InstancesService()

export function ConfigurationEditor(props: ConfigurationEditorProps) {
    const [configFile, setCF] = useState("")
    const [fileName, setFileName] = useState<any>("")
    const [configurationFileContent, setCFContent] = useState<any>("");
    const [oldConfiguration, setOldConfiguration] = useState<string>("");
    const [configuration, setConfiguration] = useState<any>([])
    const [newConfigurationFileSlide, setNewConfigurationFileSlide] = useState(false);
    const [errorClasses, setErrorClasses] = useState<any>({
        bannerBackground: "nginx-banner-neutral",
        bannerErrorMessage: "",
        backToDashboardDisabled: false,
        undoChangesButtonDisabled: true,
    });

    useEffect(() => {
        const getConfiguration = async () => {
            instanceService.getConfigurations(props.nginxInstance.id).then((data: any) => {
                //Config-Files into array!
                //@todo Refactoring: Make this more type save and check what
                // Typescript can do with undefined and null values
                let filesArray: Array<string> = data
                filesArray = filesArray.filter(item => item != "").map((item: string) => {
                    let match = item.match('(?:\\/etc\\/nginx\\/.*)');
                    if (match != undefined) {
                        return match[0].replace(`:`, ``)
                    } else {
                        return ""
                    }
                })
                setConfiguration(filesArray)
            })
        }
        getConfiguration().catch(console.error)
    }, [])

    const configurationFileOnClickHandler: any = (fileName: string) => (event: any) => {
        instanceService.getConfigurationFileContent(fileName, props.nginxInstance.id).then((data: any) => {
            setOldConfiguration(data.stdout)
            setCFContent(data.stdout);
            setFileName(fileName);
        }).catch((error: any) => console.error())

    }
    const saveConfigurationToFile: any = (file: string, containerId: string) => (event: any) => {
        //build dynamically from TextInput as B64.
        const content = btoa(configurationFileContent)
        instanceService.sendConfigurationToFile(file, containerId, content).then((data: any) => {
            //error handling here.
            instanceService.reloadNGINX(containerId).then((data: any) => {
                instanceService.displaySuccessMessage("Configuration successfully updated!");
                setErrorClasses({
                    bannerBackground: "nginx-banner-neutral",
                    backToDashboardDisabled: false,
                    undoChangesButtonDisabled: true,
                    bannerErrorMessage: ""
                });
            }).catch((reason: any) => {
                instanceService.displayErrorMessage(`Error while updating configuration: ${reason.stderr.split("\n")[1]}`);
                setErrorClasses({
                    bannerBackground: "nginx-banner-error",
                    backToDashboardDisabled: true,
                    undoChangesButtonDisabled: false,
                    bannerErrorMessage: `Error while updating configuration: ${reason.stderr.split("\n")[1]}`
                });
            })
        })
    }
    const nginxConfigurationFileOnChangeHandler = (event: SelectChangeEvent) => {
        setCF(event.target.value as string);
        setFileName(event.target.value as string);
        instanceService.getConfigurationFileContent(event.target.value as string, props.nginxInstance.id).then((data: any) => {
            setOldConfiguration(data.stdout)
            setCFContent(data.stdout);
        }).catch((error: any) => console.error())
    };
    const undoChanges: any = () => {
        setCFContent(oldConfiguration)
        const content = btoa(oldConfiguration)
        instanceService.sendConfigurationToFile(fileName, props.nginxInstance.id, content).then((data: any) => {
            //error handling here.
            instanceService.reloadNGINX(props.nginxInstance.id).then((data: any) => {
                instanceService.displaySuccessMessage("Configuration rollback successful");
                setErrorClasses({
                    bannerBackground: "nginx-banner-neutral",
                    backToDashboardDisabled: false,
                    undoChangesButtonDisabled: true,
                    bannerErrorMessage: ""
                });
            }).catch((reason: any) => {
                instanceService.displayErrorMessage("Error while rolling back configuration! Contact Support!");
                setErrorClasses({
                    bannerBackground: "nginx-banner-error",
                    backToDashboardDisabled: true,
                    undoChangesButtonDisabled: false,
                    bannerErrorMessage: `Error while updating configuration: ${reason.stderr.split("\n")[1]}`
                });
            })
        })
    }

    const handleNewConfigurationFileSlide = () => {
        setNewConfigurationFileSlide((prev) => !prev);
    };

    const content = (
        <Box
            sx={{width: "100%", height: "100vh"}}
            style={{
                position: "absolute",
                top: "0",
                zIndex: "99",
                right: "0",
                display: "flex",
                flexDirection: "row-reverse",
                backgroundColor: "transparent"
            }}
        >
            <Box
                style={{
                    display: "flex",
                    width: "75%",
                    height: "100vh",
                    borderLeft: "2px solid blue",
                    flexDirection: "column",
                    backgroundColor: "rgba(255,255,255,1)",
                    alignItems: "flex-start"
                }}
            >
                <Button onClick={handleNewConfigurationFileSlide}>Close</Button>
                <NewConfigurationFile />
            </Box>
        </Box>
    );

    return (
        <>
            <Slide direction="left" in={newConfigurationFileSlide} mountOnEnter unmountOnExit>
                {content}
            </Slide>
            <Grid container marginY={2}>
                <FormControl fullWidth>
                    <InputLabel id="demo-simple-select-label">Configuration File</InputLabel>
                    <Select
                        labelId="demo-simple-select-label"
                        id="demo-simple-select"
                        value={configFile}
                        label="Configuration File"
                        placeholder={"Select Configuration File"}
                        onChange={nginxConfigurationFileOnChangeHandler}>
                        {configuration.map((file: string, index: number) => (
                            <MenuItem value={file} key={index}>{file}</MenuItem>
                        ))
                        }
                    </Select>
                </FormControl>
            </Grid>
            {!configurationFileContent ? (
                <Grid container>
                    <Grid item marginX={"auto"} marginY={10} textAlign={"center"}>
                        <Box display={"flex"} alignItems={"center"}>
                            <DataObjectIcon style={{marginRight: "1rem", fontSize: "4rem"}}/>
                            <Typography variant={"h2"}>
                                No Configuration File selected! Please select one.
                            </Typography>
                        </Box>
                        <Button variant="contained" color={"success"} onClick={handleNewConfigurationFileSlide}
                                endIcon={<Add/>}>
                            Create New Configuration File
                        </Button>
                    </Grid>
                </Grid>
            ) : (
                <Grid container>
                    <Grid item sm={12}>
                        <Typography variant={"h4"} marginY={2}>
                            {fileName}
                        </Typography>
                        <Button variant={"outlined"} color={"success"} startIcon={<Add/>}
                                onClick={handleNewConfigurationFileSlide}>New File</Button>
                        <Button variant={"outlined"} startIcon={<PublishIcon/>}
                                onClick={saveConfigurationToFile(fileName, props.nginxInstance.id)}
                                style={{marginLeft: "0.5rem"}}>Publish</Button>
                        <Button variant={"outlined"} startIcon={<UndoIcon/>}
                                onClick={undoChanges}
                                color={"error"}
                                style={{marginLeft: "0.5rem"}}
                                disabled={errorClasses.undoChangesButtonDisabled}
                        >Undo Changes</Button>
                    </Grid>
                    <Grid item sm={12} lg={12} marginTop={2}>
                        <Typography variant={"h3"}>Configuration Editor</Typography>
                        <Editor
                            value={configurationFileContent}
                            className={"nginx-config-editor"}
                            onValueChange={configurationFileContent => setCFContent(configurationFileContent)}
                            highlight={
                                configurationFileContent => highlight(configurationFileContent, languages.nginx, "nginx")
                                    .split("\n")
                                    .map((line, i) => `<span class='editorLineNumber' key=${i}>${i + 1}</span>${line}`)
                                    .join('\n')
                            }
                            padding={10}
                            style={{
                                fontFamily: '"Fira code", "Fira Mono", monospace',
                                fontSize: 14,
                                outline: 0
                            }}
                        />
                    </Grid>
                </Grid>
            )}
        </>
    )
}
