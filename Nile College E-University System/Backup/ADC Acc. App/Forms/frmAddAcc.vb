Imports System.Data.SqlClient
Public Class frmAddAcc
    Inherits System.Windows.Forms.Form

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
    Friend WithEvents GroupBox2 As System.Windows.Forms.GroupBox
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents txtName As System.Windows.Forms.TextBox
    Friend WithEvents btnClose As System.Windows.Forms.Button
    Friend WithEvents btnSave As System.Windows.Forms.Button
    Friend WithEvents ListBox1 As System.Windows.Forms.ListBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmAddAcc))
        Me.GroupBox2 = New System.Windows.Forms.GroupBox
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.Label1 = New System.Windows.Forms.Label
        Me.txtName = New System.Windows.Forms.TextBox
        Me.btnClose = New System.Windows.Forms.Button
        Me.btnSave = New System.Windows.Forms.Button
        Me.ListBox1 = New System.Windows.Forms.ListBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'GroupBox2
        '
        Me.GroupBox2.Location = New System.Drawing.Point(184, 139)
        Me.GroupBox2.Name = "GroupBox2"
        Me.GroupBox2.Size = New System.Drawing.Size(240, 3)
        Me.GroupBox2.TabIndex = 51
        Me.GroupBox2.TabStop = False
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.Label1)
        Me.GroupBox1.Controls.Add(Me.txtName)
        Me.GroupBox1.Location = New System.Drawing.Point(184, 83)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(240, 48)
        Me.GroupBox1.TabIndex = 50
        Me.GroupBox1.TabStop = False
        '
        'Label1
        '
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label1.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label1.Location = New System.Drawing.Point(159, 19)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(76, 13)
        Me.Label1.TabIndex = 23
        Me.Label1.Text = "«”„ «·Õ”«» :"
        Me.Label1.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'txtName
        '
        Me.txtName.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.txtName.Location = New System.Drawing.Point(8, 16)
        Me.txtName.Name = "txtName"
        Me.txtName.Size = New System.Drawing.Size(148, 20)
        Me.txtName.TabIndex = 24
        '
        'btnClose
        '
        Me.btnClose.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnClose.Location = New System.Drawing.Point(216, 152)
        Me.btnClose.Name = "btnClose"
        Me.btnClose.Size = New System.Drawing.Size(75, 32)
        Me.btnClose.TabIndex = 49
        Me.btnClose.Text = "«€·«ﬁ"
        '
        'btnSave
        '
        Me.btnSave.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.btnSave.Location = New System.Drawing.Point(320, 152)
        Me.btnSave.Name = "btnSave"
        Me.btnSave.Size = New System.Drawing.Size(75, 32)
        Me.btnSave.TabIndex = 48
        Me.btnSave.Text = "Õ›Ÿ"
        '
        'ListBox1
        '
        Me.ListBox1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.ListBox1.HorizontalScrollbar = True
        Me.ListBox1.Location = New System.Drawing.Point(8, 8)
        Me.ListBox1.Name = "ListBox1"
        Me.ListBox1.Size = New System.Drawing.Size(168, 210)
        Me.ListBox1.TabIndex = 47
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label2.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label2.Location = New System.Drawing.Point(342, 60)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(44, 13)
        Me.Label2.TabIndex = 52
        Me.Label2.Text = "«·Õ“„… :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.DropDownWidth = 250
        Me.ComboBox1.Location = New System.Drawing.Point(192, 56)
        Me.ComboBox1.MaxDropDownItems = 15
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(148, 21)
        Me.ComboBox1.TabIndex = 53
        '
        'frmAddAcc
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(432, 230)
        Me.Controls.Add(Me.ComboBox1)
        Me.Controls.Add(Me.Label2)
        Me.Controls.Add(Me.GroupBox2)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.btnClose)
        Me.Controls.Add(Me.btnSave)
        Me.Controls.Add(Me.ListBox1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(440, 264)
        Me.MinimumSize = New System.Drawing.Size(440, 264)
        Me.Name = "frmAddAcc"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "≈÷«›… Õ”«» —∆Ì”Ì"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

#End Region

    Private Sub frmAddAcc_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        Try
            Dim cmd As New SqlCommand("SELECT distinct Pack FROM Acc where pack is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ComboBox1.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ComboBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub ComboBox1_SelectedIndexChanged(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ComboBox1.SelectedIndexChanged
        Try
            If Me.ComboBox1.SelectedIndex = -1 Then
                Me.ListBox1.Items.Clear()
                Exit Sub
            End If

            Dim cmd As New SqlCommand("SELECT distinct Acc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ListBox1.Items.Clear()
            SqlReader = cmd.ExecuteReader
            While SqlReader.Read
                Me.ListBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()

        Catch ex As Exception
            MsgBox(ex.Message)
            Try
                cnn.Close()
            Catch

            End Try
        End Try
    End Sub

    Private Sub btnSave_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnSave.Click
        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("«·—Ã«¡  ÕœÌœ «·Õ“„…")
            Me.ComboBox1.Focus()
            Exit Sub
        End If

        If Me.txtName.Text.Length = 0 Then
            MsgBox("«·—Ã«¡ ≈œŒ«· ≈”„ «·Õ”«»")
            Me.txtName.Focus()
            Exit Sub
        End If

        Try
            Dim cmd As New SqlCommand("Insert into acc (pack,Acc) values (N'" & Me.ComboBox1.SelectedItem & "',N'" & Me.txtName.Text & "')", cnn)

            cnn.Open()
            cmd.ExecuteNonQuery()
            cnn.Close()

            MsgBox("      „ «·Õ›Ÿ")
            Me.txtName.Clear()

            Dim cmd1 As New SqlCommand("SELECT distinct Acc FROM Acc where pack=N'" & Me.ComboBox1.SelectedItem & "' and Acc is not null", cnn)
            Dim SqlReader As SqlDataReader

            'OPEN THE CONNECTION
            'FILL THE DATASET & THE COMBOBOX
            cnn.Open()
            Me.ListBox1.Items.Clear()
            SqlReader = cmd1.ExecuteReader
            While SqlReader.Read
                Me.ListBox1.Items.Add(SqlReader.Item(0))
            End While
            cnn.Close()
        Catch ex As Exception
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub btnClose_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles btnClose.Click
        Me.Close()
    End Sub
End Class
