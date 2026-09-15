Imports System.Data.SqlClient

Public Class frmLogin
    Inherits System.Windows.Forms.Form

    Dim i As Integer = 0

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents btnConnect As System.Windows.Forms.Button
    Friend WithEvents GroupBox4 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents LblError As System.Windows.Forms.Label
    Friend WithEvents txtSNo As System.Windows.Forms.TextBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents Label3 As System.Windows.Forms.Label
    Friend WithEvents txtPassWord As System.Windows.Forms.TextBox
    Friend WithEvents txtUserName As System.Windows.Forms.TextBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmLogin))
        Me.btnConnect = New System.Windows.Forms.Button()
        Me.GroupBox4 = New System.Windows.Forms.GroupBox()
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.LblError = New System.Windows.Forms.Label()
        Me.txtSNo = New System.Windows.Forms.TextBox()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.Label2 = New System.Windows.Forms.Label()
        Me.Label3 = New System.Windows.Forms.Label()
        Me.txtPassWord = New System.Windows.Forms.TextBox()
        Me.txtUserName = New System.Windows.Forms.TextBox()
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'btnConnect
        '
        Me.btnConnect.BackColor = System.Drawing.Color.Transparent
        Me.btnConnect.Location = New System.Drawing.Point(196, 139)
        Me.btnConnect.Name = "btnConnect"
        Me.btnConnect.Size = New System.Drawing.Size(91, 23)
        Me.btnConnect.TabIndex = 1
        Me.btnConnect.Text = "ÊÓÌíá ÇáÏÎæá"
        Me.btnConnect.UseVisualStyleBackColor = False
        '
        'GroupBox4
        '
        Me.GroupBox4.Location = New System.Drawing.Point(7, 125)
        Me.GroupBox4.Name = "GroupBox4"
        Me.GroupBox4.Size = New System.Drawing.Size(286, 8)
        Me.GroupBox4.TabIndex = 44
        Me.GroupBox4.TabStop = False
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.LblError)
        Me.GroupBox1.Controls.Add(Me.txtSNo)
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.Label2)
        Me.GroupBox1.Controls.Add(Me.Label3)
        Me.GroupBox1.Controls.Add(Me.txtPassWord)
        Me.GroupBox1.Controls.Add(Me.txtUserName)
        Me.GroupBox1.Location = New System.Drawing.Point(7, 4)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(286, 118)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'LblError
        '
        Me.LblError.AutoSize = True
        Me.LblError.Font = New System.Drawing.Font("Times New Roman", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.LblError.ForeColor = System.Drawing.Color.Red
        Me.LblError.Location = New System.Drawing.Point(6, 100)
        Me.LblError.Name = "LblError"
        Me.LblError.Size = New System.Drawing.Size(180, 15)
        Me.LblError.TabIndex = 3
        Me.LblError.Text = "ßáãÉ ÇáãÑæÑ Çæ ÑÞã ÇáãÓÊÎÏã ÛíÑ ÕÍíÍ"
        '
        'txtSNo
        '
        Me.txtSNo.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtSNo.Location = New System.Drawing.Point(133, 14)
        Me.txtSNo.Name = "txtSNo"
        Me.txtSNo.Size = New System.Drawing.Size(63, 20)
        Me.txtSNo.TabIndex = 0
        Me.txtSNo.TextAlign = System.Windows.Forms.HorizontalAlignment.Center
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Location = New System.Drawing.Point(202, 16)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(80, 13)
        Me.Label1.TabIndex = 0
        Me.Label1.Text = "ÑÞã ÇáãÓÊÎÏã:"
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Location = New System.Drawing.Point(202, 43)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(85, 13)
        Me.Label2.TabIndex = 2
        Me.Label2.Text = "ÇÓã ÇáãÓÊÎÏã:"
        '
        'Label3
        '
        Me.Label3.AutoSize = True
        Me.Label3.Location = New System.Drawing.Point(202, 69)
        Me.Label3.Name = "Label3"
        Me.Label3.Size = New System.Drawing.Size(63, 13)
        Me.Label3.TabIndex = 3
        Me.Label3.Text = "ßáãÉ ÇáãÑæÑ:"
        '
        'txtPassWord
        '
        Me.txtPassWord.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtPassWord.Location = New System.Drawing.Point(6, 67)
        Me.txtPassWord.Name = "txtPassWord"
        Me.txtPassWord.PasswordChar = Global.Microsoft.VisualBasic.ChrW(42)
        Me.txtPassWord.Size = New System.Drawing.Size(190, 20)
        Me.txtPassWord.TabIndex = 1
        '
        'txtUserName
        '
        Me.txtUserName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtUserName.Location = New System.Drawing.Point(6, 41)
        Me.txtUserName.Name = "txtUserName"
        Me.txtUserName.Size = New System.Drawing.Size(190, 20)
        Me.txtUserName.TabIndex = 2
        '
        'frmLogin
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(301, 163)
        Me.Controls.Add(Me.GroupBox4)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.btnConnect)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.Location = New System.Drawing.Point(289, 202)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(317, 202)
        Me.MinimumSize = New System.Drawing.Size(317, 202)
        Me.Name = "frmLogin"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.RightToLeftLayout = True
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ÊÓÌíá ÇáÏÎæá"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)

    End Sub

#End Region

    Sub Clear()
        Me.txtPassWord.Clear()
        Me.txtUserName.Clear()
        Me.txtUserName.Focus()
    End Sub

    Sub Login()
        Try
            If Me.txtUserName.Text.Trim.Length = 0 OrElse Me.txtPassWord.Text.Trim.Length = 0 Then
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim Pass As String
            Dim B As Boolean = False

            Dim cmd As New SqlCommand("Select Pass,Status From Users Where SNo=" & Me.txtSNo.Text.Trim, cnn)
            Dim Reader As SqlDataReader

            cnn.Open()
            Reader = cmd.ExecuteReader
            While Reader.Read
                If Reader.Item(1) = "Disable" Then
                    MsgBox("Your account is not active, please contact the system administrator")
                Else
                    Pass = CStr(Reader.Item(0))
                    If Pass = CStr(Me.txtPassWord.Text) Then
                        CurrentUser = Me.txtUserName.Text
                        CurrentUserID = Me.txtSNo.Text
                        PWD = Pass

                        'Priv = Reader.Item(1)
                        Me.Cursor = Cursors.Default
                        Reader.Close()
                        cnn.Close()
                        'Mainfrm.Show()
                        'frmMainReg.Show()
                        frmMainPanal.Show()
                        ' frmMainFin.Show()
                        B = True
                        Exit While
                    Else
                        Me.LblError.Text = "Invalid username or password"
                    End If
                End If
            End While
            cnn.Close()

            If B = True Then
                'Insert into logging log, table "UsersLogin"
                'My.Computer.Name,my.Computer.IP
                    Try
                        Me.Cursor = Cursors.WaitCursor

                    Dim cmd1 As New SqlCommand("Insert Into UsersLogin (UserID,FullName,Machine) Values (@UserID,@FullName,@Machine)", cnn)

                        cnn.Open()

                    'Add values
                    cmd1.Parameters.AddWithValue("@UserID", CurrentUserID)
                    cmd1.Parameters.AddWithValue("@FullName", CurrentUser)

                    Dim h As System.Net.IPHostEntry = System.Net.Dns.GetHostByName(System.Net.Dns.GetHostName)

                    cmd1.Parameters.AddWithValue("@Machine", My.Computer.Name & "(" & h.AddressList.GetValue(0).ToString & ")")

                    cmd1.ExecuteNonQuery()
                        cnn.Close()

                    'RESTORE DEFAULTS
                        Clear()

                        Me.Cursor = Cursors.Default
                    Catch ex As Exception
                        Me.Cursor = Cursors.Default
                        MsgBox(ex.ToString)
                        If cnn.State = ConnectionState.Open Then
                            cnn.Close()
                        End If
                    End Try

                Me.Close()
            End If
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Sub GetName()
        Try
            Me.Cursor = Cursors.WaitCursor

            Dim cmd As New SqlCommand("Select FullName From Users Where SNo=" & Me.txtSNo.Text, cnn)

            cnn.Open()
            Me.txtUserName.Text = CStr(cmd.ExecuteScalar)
            cnn.Close()

            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub txtSNo_KeyUp(ByVal sender As Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtSNo.KeyUp
        If Me.txtSNo.Text.Trim.Length > 0 Then
            If e.KeyCode = Keys.Enter Then
                GetName()
            End If
        End If
    End Sub

    Private Sub txtSNo_Leave(sender As Object, e As System.EventArgs) Handles txtSNo.Leave
        If Me.txtSNo.Text.Trim.Length > 0 Then
            GetName()
        End If
    End Sub

    Private Sub txtSNo_TextChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles txtSNo.TextChanged
        Me.txtUserName.Clear()
        Me.LblError.Text = ""
    End Sub

    Private Sub txtPassWord_KeyUp(ByVal sender As System.Object, ByVal e As System.Windows.Forms.KeyEventArgs) Handles txtPassWord.KeyUp
        If e.KeyCode = Keys.Enter Then
            Login()
        End If
    End Sub

    Private Sub btnConnect_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnConnect.Click
        Login()
    End Sub

    Private Sub frmLogin_Load(sender As System.Object, e As System.EventArgs) Handles MyBase.Load
        Me.LblError.Text = ""
    End Sub
End Class
